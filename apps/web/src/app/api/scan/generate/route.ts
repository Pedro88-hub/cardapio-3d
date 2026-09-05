import { NextRequest, NextResponse } from 'next/server';
import { copyFile, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const runtime = 'nodejs';
export const maxDuration = 120;

function runNode(script: string, args: string[], cwd: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd,
      stdio: 'pipe',
    });
    let err = '';
    child.stderr.on('data', (d) => {
      err += String(d);
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(err || `Script saiu com código ${code}`));
    });
  });
}

async function replicateTripoSr(imageDataUri: string, token: string) {
  const create = await fetch(
    'https://api.replicate.com/v1/models/camenduru/tripo-sr/predictions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait',
      },
      body: JSON.stringify({
        input: {
          image_path: imageDataUri,
          foreground_ratio: 0.85,
          mc_resolution: 256,
        },
      }),
    },
  );

  let prediction = (await create.json()) as {
    id?: string;
    status?: string;
    output?: string | string[] | { mesh?: string };
    error?: string;
    detail?: string;
    urls?: { get?: string };
  };

  if (!create.ok && create.status !== 201 && create.status !== 202) {
    throw new Error(
      prediction.detail || prediction.error || `Replicate HTTP ${create.status}`,
    );
  }

  const getUrl =
    prediction.urls?.get ||
    (prediction.id
      ? `https://api.replicate.com/v1/predictions/${prediction.id}`
      : null);

  const started = Date.now();
  while (
    prediction.status &&
    prediction.status !== 'succeeded' &&
    prediction.status !== 'failed' &&
    prediction.status !== 'canceled'
  ) {
    if (Date.now() - started > 90_000) {
      throw new Error('Geração 3D demorou demais. Tente de novo.');
    }
    await new Promise((r) => setTimeout(r, 2000));
    if (!getUrl) break;
    const poll = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    prediction = (await poll.json()) as typeof prediction;
  }

  if (prediction.status === 'failed' || prediction.error) {
    throw new Error(prediction.error || 'Falha na geração 3D');
  }

  const output = prediction.output;
  let glbUrl: string | null = null;
  if (typeof output === 'string') glbUrl = output;
  else if (Array.isArray(output))
    glbUrl = output.find((u) => String(u).includes('.glb')) || output[0];
  else if (output && typeof output === 'object' && 'mesh' in output) {
    glbUrl = (output as { mesh?: string }).mesh || null;
  }

  if (!glbUrl) throw new Error('A IA não retornou um modelo 3D.');
  return glbUrl;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('photo');
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: 'Tire uma foto do prato para gerar o 3D.' },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length > 10 * 1024 * 1024) {
    return NextResponse.json(
      { error: 'Foto muito grande (máx. 10 MB).' },
      { status: 400 },
    );
  }

  const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');
  const photosDir = path.join(uploadsRoot, 'photos');
  const modelsDir = path.join(uploadsRoot, 'models');
  await mkdir(photosDir, { recursive: true });
  await mkdir(modelsDir, { recursive: true });

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const photoPath = path.join(photosDir, `${id}.jpg`);
  await writeFile(photoPath, bytes);
  const photoUrl = `/uploads/photos/${id}.jpg`;

  const token = process.env.REPLICATE_API_TOKEN;
  const glbOut = path.join(modelsDir, `${id}.glb`);
  const usdzOut = path.join(modelsDir, `${id}.usdz`);
  let mode: 'ai' | 'demo' = 'demo';

  try {
    if (token) {
      const dataUri = `data:${file.type || 'image/jpeg'};base64,${bytes.toString('base64')}`;
      const remoteGlb = await replicateTripoSr(dataUri, token);
      const glbRes = await fetch(remoteGlb);
      if (!glbRes.ok) throw new Error('Não foi possível baixar o modelo gerado.');
      await writeFile(glbOut, Buffer.from(await glbRes.arrayBuffer()));
      mode = 'ai';
    } else {
      // Demo local: usa modelo base já em escala de prato para validar o fluxo
      const baseGlb = path.join(process.cwd(), 'public', 'models', 'burger.glb');
      const baseUsdz = path.join(process.cwd(), 'public', 'models', 'burger.usdz');
      await copyFile(baseGlb, glbOut);
      await copyFile(baseUsdz, usdzOut);
    }

    if (mode === 'ai') {
      // Gera USDZ + normaliza tamanho (~22 cm) para AR 1:1
      try {
        await runNode(
          path.join(process.cwd(), 'scripts', 'rescale-model.mjs'),
          [path.join('public', 'uploads', 'models', `${id}.glb`), '0.22'],
          process.cwd(),
        );
      } catch {
        // Se conversão falhar, ainda entregamos o GLB; iOS pode gerar USDZ no viewer
        if (!(await fileExists(usdzOut))) {
          /* optional */
        }
      }
    }
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : 'Não foi possível gerar o modelo 3D.',
        photoUrl,
      },
      { status: 500 },
    );
  }

  const hasUsdz = await fileExists(usdzOut);

  return NextResponse.json({
    photoUrl,
    glbUrl: `/uploads/models/${id}.glb`,
    usdzUrl: hasUsdz ? `/uploads/models/${id}.usdz` : null,
    mode,
    message:
      mode === 'ai'
        ? 'Modelo 3D gerado a partir da foto do prato.'
        : 'Prévia 3D de demonstração. Configure REPLICATE_API_TOKEN no servidor para gerar o modelo real do seu prato automaticamente.',
  });
}

async function fileExists(p: string) {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}
