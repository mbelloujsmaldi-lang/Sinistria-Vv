// Rastérise public/logo/sinistria-wordmark.svg en PNG (data URL) pour jsPDF.
// Navigateur uniquement (canvas). L'ajout direct d'un SVG dans jsPDF est
// capricieux ; un PNG 960x240 (≈ 400 dpi pour 60 mm) est fiable et net à l'impression.
// Renvoie null en cas d'échec : la fiche utilise alors son repli dessiné,
// la génération n'est jamais bloquée par le logo.
export async function rasteriserLogo(): Promise<string | null> {
  try {
    const res = await fetch("/logo/sinistria-wordmark.svg");
    if (!res.ok) return null;
    const svg = (await res.text()).replace("<svg ", '<svg width="960" height="240" ');
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("logo illisible"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = 960;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, 960, 240);
      return canvas.toDataURL("image/png");
    } finally {
      URL.revokeObjectURL(url);
    }
  } catch {
    return null;
  }
}
