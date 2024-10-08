import Image from "next/image";

interface QuivrLogoProps {
  size: number;
  color?: "white" | "black" | "primary";
}

export const QuivrLogo = ({
  size,
  color = "white",
}: QuivrLogoProps): JSX.Element => {
  const src = color === "primary" ? "/logo.webp" : "/cortx_white.webp";
  const filter = color === "black" ? "invert(1)" : "none";

  return (
    <Image
      src={src}
      alt="Quivr Logo"
      width={size}
      height={size}
      style={{ filter }}
    />
  );
};
