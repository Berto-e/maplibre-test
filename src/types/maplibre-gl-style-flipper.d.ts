declare module "maplibre-gl-style-flipper" {
  import { IControl, Map } from "maplibre-gl";

  interface StyleDefinition {
    code: string;
    url: string;
    image?: string;
  }

  interface StyleFlipperOptions {
    styles?: { [key: string]: StyleDefinition };
    defaultStyle?: string;
  }

  export default class StyleFlipperControl implements IControl {
    constructor(
      styles: { [key: string]: StyleDefinition },
      options?: StyleFlipperOptions
    );

    onAdd(map: Map): HTMLElement;
    onRemove(): void;

    setCurrentStyleCode(styleCode: string): void;
    getCurrentStyleCode(): string;

    getContainer(): HTMLElement;
  }
}
