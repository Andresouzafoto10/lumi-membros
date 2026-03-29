import html2canvas from "html2canvas";

export async function downloadCertificateAsPng(
  containerId: string,
  filename: string
): Promise<void> {
  const element = document.getElementById(containerId);
  if (!element) throw new Error("Container não encontrado");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: null,
    width: element.offsetWidth,
    height: element.offsetHeight,
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png", 1.0);
  link.click();
}
