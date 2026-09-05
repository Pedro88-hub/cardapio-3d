import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_MODEL = 20 * 1024 * 1024;

const ALLOWED: Record<string, { max: number; folder: string }> = {
  'image/jpeg': { max: MAX_IMAGE, folder: 'photos' },
  'image/png': { max: MAX_IMAGE, folder: 'photos' },
  'image/webp': { max: MAX_IMAGE, folder: 'photos' },
  'model/gltf-binary': { max: MAX_MODEL, folder: 'models' },
  'application/octet-stream': { max: MAX_MODEL, folder: 'models' },
};

function extFromName(name: string) {
  const m = name.toLowerCase().match(/\.(jpe?g|png|webp|glb|usdz)$/);
  return m ? m[1].replace('jpeg', 'jpg') : null;
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Envie um arquivo.' }, { status: 400 });
  }

  const ext = extFromName(file.name);
  if (!ext) {
    return NextResponse.json(
      { error: 'Formato não suportado. Use foto (JPG/PNG) ou modelo (.glb / .usdz).' },
      { status: 400 },
    );
  }

  const isPhoto = ['jpg', 'png', 'webp'].includes(ext);
  const max = isPhoto ? MAX_IMAGE : MAX_MODEL;
  if (file.size > max) {
    return NextResponse.json(
      {
        error: isPhoto
          ? 'Foto muito grande (máx. 8 MB).'
          : 'Modelo 3D muito grande (máx. 15–20 MB). Otimize no Polycam antes.',
      },
      { status: 400 },
    );
  }

  const folder = isPhoto ? 'photos' : 'models';
  const dir = path.join(process.cwd(), 'public', 'uploads', folder);
  await mkdir(dir, { recursive: true });

  const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, safe), buffer);

  const url = `/uploads/${folder}/${safe}`;
  return NextResponse.json({
    url,
    kind: isPhoto ? 'photo' : ext === 'usdz' ? 'usdz' : 'glb',
    size: file.size,
  });
}
