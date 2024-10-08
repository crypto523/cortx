import Image from "next/image";
import Link from "next/link";

export const Logo = (): JSX.Element => {
  return (
    <Link
      data-testid="app-logo"
      href={"/chat"}
      className="flex items-center gap-4"
    >
      <Image
        className="rounded-full"
        src={"/logo.webp"}
        alt="Quivr Logo"
        width={64}
        height={64}
      />
      <h1 className="font-bold" style={{fontSize:'1.5rem'}}>Cortx AI</h1>
    </Link>
  );
};
