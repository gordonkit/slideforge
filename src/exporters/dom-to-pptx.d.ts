declare module 'dom-to-pptx' {
  export function exportToPptx(
    target: HTMLElement[],
    options: {
      width: number;
      height: number;
      skipDownload: boolean;
      svgAsVector: boolean;
      autoEmbedFonts: boolean;
    },
  ): Promise<Blob>;
}
