import Image from "next/image";
import { BrandLogo, BRAND_NAME, BRAND_TAGLINE } from "@/components/brand/brand-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const iconSizes = [1024, 512, 192, 64, 32] as const;

export default function BrandReviewPage() {
  return (
    <div className="space-y-6 md:space-y-8">
      <section className="space-y-3">
        <p className="text-sm font-semibold text-accent">Brand review</p>
        <h1 className="text-4xl font-semibold leading-tight tracking-normal text-primary md:text-5xl">
          Hearth
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
          Review the Hearth mark, wordmark, header usage, and installed-app surfaces.
        </p>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>App icon scale</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {iconSizes.map((size) => (
            <IconScalePreview key={size} size={size} />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Hearth wordmark</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-background p-8">
              <BrandLogo showTagline className="max-w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Header usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-background p-4">
              <div className="flex h-16 items-center justify-between rounded-xl bg-card px-4 shadow-sm">
                <BrandLogo />
                <nav className="hidden gap-5 text-sm font-medium text-muted-foreground sm:flex">
                  <span>Tonight</span>
                  <span>Insights</span>
                  <span>Meals</span>
                </nav>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Mobile home screen</CardTitle>
          </CardHeader>
          <CardContent>
            <MobileHomeScreenMockup />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Splash screen</CardTitle>
          </CardHeader>
          <CardContent>
            <SplashScreenMockup />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Favicon preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-xl overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-warning/70" />
              <span className="h-3 w-3 rounded-full bg-success/70" />
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Image
                alt="Hearth"
                className="h-4 w-4 rounded-[28%]"
                height={16}
                src="/favicon.ico"
                width={16}
              />
              <span className="min-w-0 truncate text-sm font-medium">
                Hearth - Dinner is handled
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IconScalePreview({ size }: { size: (typeof iconSizes)[number] }) {
  const isLarge = size > 512;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{size}px</p>
        <p className="text-xs text-muted-foreground">Rendered at actual CSS size</p>
      </div>
      <div className="overflow-auto rounded-2xl border bg-background p-4">
        <Image
          alt="Hearth"
          className="block rounded-[28%] shadow-sm"
          height={size}
          priority={isLarge}
          src="/icons/hearth-icon.svg"
          style={{ height: size, maxWidth: "none", width: size }}
          width={size}
        />
      </div>
    </div>
  );
}

function MobileHomeScreenMockup() {
  return (
    <div className="mx-auto w-full max-w-[22rem] rounded-[2.5rem] bg-primary p-3 shadow-sm">
      <div className="rounded-[2rem] bg-[#0F2622] p-5 text-primary-foreground">
        <div className="mx-auto mb-5 h-1.5 w-20 rounded-full bg-primary-foreground/20" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, index) =>
            index === 0 ? (
              <div className="flex flex-col items-center gap-2" key="hearth">
                <Image
                  alt="Hearth"
                  className="h-14 w-14 rounded-[28%] shadow-sm"
                  height={56}
                  src="/icons/hearth-icon.svg"
                  width={56}
                />
                <span className="max-w-full truncate text-xs">{BRAND_NAME}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 opacity-45" key={index}>
                <span className="h-14 w-14 rounded-[28%] bg-primary-foreground/15" />
                <span className="h-2 w-10 rounded-full bg-primary-foreground/15" />
              </div>
            )
          )}
        </div>
        <div className="mt-9 rounded-[1.5rem] bg-primary-foreground/10 p-3">
          <div className="mx-auto h-1 w-24 rounded-full bg-primary-foreground/20" />
        </div>
      </div>
    </div>
  );
}

function SplashScreenMockup() {
  return (
    <div className="mx-auto flex aspect-[9/16] w-full max-w-[24rem] flex-col items-center justify-center rounded-[2.5rem] bg-primary p-8 text-center text-primary-foreground shadow-sm">
      <Image
        alt="Hearth"
        className="h-24 w-24 rounded-[28%] shadow-sm"
        height={96}
        priority
        src="/icons/hearth-icon.svg"
        width={96}
      />
      <p className="mt-6 text-3xl font-semibold tracking-normal">{BRAND_NAME}</p>
      <p className="mt-2 text-sm text-primary-foreground/75">{BRAND_TAGLINE}</p>
    </div>
  );
}
