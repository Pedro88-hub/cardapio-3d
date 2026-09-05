import { NextRequest, NextResponse } from 'next/server';
import { copyFile, mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export const runtime = 'nodejs';
export const maxDuration = 120;

/** camenduru/tripo-sr — latest version (image → mesh) */
const TRIPOSR_VERSION =
  'e0d3fe8abce3ba86497ea3530d9eae59af7b2231b6c82bedfc32b0732d35ec3a';

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

async function fileExists(p: string) {
  try {
    await readFile(p);
    return true;
  } catch {
    return false;
  }
}

type Prediction = {
  id?: string;
  status?: string;
  output?: unknown;
  error?: string;
  detail?: string;
  urls?: { get?: string };
};

function extractGlbUrl(output: unknown): string | null {
  if (typeof output === 'string') return output;
  if (Array.isArray(output)) {
    const hit = output.find((u) => String(u).includes('.glb'));
    return hit ? String(hit) : output[0] ? String(output[0]) : null;
  }
  if (output && typeof output === 'object') {
    const o = output as Record<string, unknown>;
    if (typeof o.mesh === 'string') return o.mesh;
    if (typeof o.model_file === 'string') return o.model_file;
    if (typeof o.glb === 'string') return o.glb;
  }
  return null;
}

async function replicateTripoSr(imageDataUri: string, token: string) {
  const create = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: TRIPOSR_VERSION,
      input: {
        image_path: imageDataUri,
        do_remove_background: true,
        foreground_ratio: 0.85,
      },
    }),
  });

  let prediction = (await create.json()) as Prediction;

  if (!create.ok) {
    const msg =
      prediction.detail ||
      prediction.error ||
      `Replicate HTTP ${create.status}`;
    if (create.status === 402) {
      throw new Error(
        'Sem créditos no Replicate. Adicione crédito em replicate.com/account/billing (aguarde alguns minutos após pagar) e tente de novo.',
      );
    }
    if (create.status === 429) {
      throw new Error(
        'Limite do Replicate atingido. Aguarde 1 minuto ou adicione pagamento em replicate.com/account/billing.',
      );
    }
    if (create.status === 401) {
      throw new Error(
        'Token do Replicate inválido. Gere um novo em replicate.com/account/api-tokens e atualize o .env.local.',
      );
    }
    throw new Error(msg);
  }

  const getUrl =
    prediction.urls?.get ||
    (prediction.id
      ? `https://api.replicate.com/v1/predictions/${prediction.id}`
      : null);

  const started = Date.now();
  while (
    prediction.status === 'starting' ||
    prediction.status === 'processing' ||
    prediction.status === 'queued'
  ) {
    if (Date.now() - started > 100_000) {
      throw new Error('Geração 3D demorou demais. Tente de novo.');
    }
    await new Promise((r) => setTimeout(r, 2500));
    if (!getUrl) break;
    const poll = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    prediction = (await poll.json()) as Prediction;
  }

  if (prediction.status === 'failed' || prediction.error) {
    throw new Error(prediction.error || 'Falha na geração 3D no Replicate');
  }

  const glbUrl = extractGlbUrl(prediction.output);
  if (!glbUrl) {
    throw new Error('A IA não retornou um arquivo 3D (.glb).');
  }
  return glbUrl;
}

async function copyDemoModels(glbOut: string, usdzOut: string) {
  const baseGlb = path.join(process.cwd(), 'public', 'models', 'burger.glb');
  const baseUsdz = path.join(process.cwd(), 'public', 'models', 'burger.usdz');
  await copyFile(baseGlb, glbOut);
  await copyFile(baseUsdz, usdzOut);
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

  const token = process.env.REPLICATE_API_TOKEN?.trim();
  const glbOut = path.join(modelsDir, `${id}.glb`);
  const usdzOut = path.join(modelsDir, `${id}.usdz`);
  let mode: 'ai' | 'demo' = 'demo';
  let message =
    'Prévia 3D de demonstração. Configure REPLICATE_API_TOKEN para gerar o modelo real.';

  try {
    if (token) {
      try {
        const mime = file.type || 'image/jpeg';
        const dataUri = `data:${mime};base64,${bytes.toString('base64')}`;
        const remoteGlb = await replicateTripoSr(dataUri, token);
        const glbRes = await fetch(remoteGlb);
        if (!glbRes.ok) {
          throw new Error('Não foi possível baixar o modelo gerado.');
        }
        await writeFile(glbOut, Buffer.from(await glbRes.arrayBuffer()));
        mode = 'ai';
        message = 'Modelo 3D gerado a partir da foto do prato.';

        try {
          await runNode(
            path.join(process.cwd(), 'scripts', 'rescale-model.mjs'),
            [path.join('public', 'uploads', 'models', `${id}.glb`), '0.22'],
            process.cwd(),
          );
        } catch {
          // GLB já serve; USDZ opcional
        }
      } catch (aiErr) {
        // Não deixa o dono travado: cai no demo com a mensagem do erro
        await copyDemoModels(glbOut, usdzOut);
        mode = 'demo';
        message = `Não deu para gerar o 3D real agora (${aiErr instanceof Error ? aiErr.message : 'erro na IA'}). Usamos uma prévia 3D para você continuar. Tente de novo em 1 minuto.`;
      }
    } else {
      await copyDemoModels(glbOut, usdzOut);
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
    message,
  });
}
