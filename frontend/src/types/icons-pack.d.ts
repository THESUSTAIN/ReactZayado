// Le paquet @icons-pack/react-simple-icons n'est installé que dans la variante
// Vite (Railway). Déclarations minimales pour que le type-check craco passe.
declare module "@icons-pack/react-simple-icons" {
  import type { ComponentType, SVGProps } from "react";
  export type IconType = ComponentType<
    SVGProps<SVGSVGElement> & { size?: number | string; color?: string }
  >;
  export const SiCodesandbox: IconType;
  export const SiDribbble: IconType;
  export const SiFacebook: IconType;
  export const SiFigma: IconType;
  export const SiFramer: IconType;
  export const SiGithub: IconType;
  export const SiGitlab: IconType;
  export const SiGooglechrome: IconType;
  export const SiInstagram: IconType;
  export const SiTrello: IconType;
  export const SiTwitch: IconType;
  export const SiX: IconType;
  export const SiYoutube: IconType;
}
