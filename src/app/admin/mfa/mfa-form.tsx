"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonClass, FormMessage, Input, Label, Spinner } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";

type Enrollment = { factorId: string; qrCode: string; secret: string; uri: string };

export function MfaForm({ factorId }: { factorId: string | null }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  // First visit: create a new TOTP factor and show its QR code.
  useEffect(() => {
    if (factorId) return;
    let cancelled = false;

    (async () => {
      const supabase = createClient();
      // Drop half-finished enrollments from earlier visits.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.factor_type === "totp" && f.status === "unverified") {
          await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `PetLink ${new Date().toISOString().slice(0, 10)}`,
      });
      if (cancelled) return;
      if (error) {
        setError("לא הצלחנו להתחיל את ההגדרה. רעננו את העמוד.");
        return;
      }
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
        uri: data.totp.uri,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [factorId]);

  const activeFactorId = factorId ?? enrollment?.factorId;

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (!activeFactorId) return;
    setPending(true);
    setError(undefined);

    const supabase = createClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: activeFactorId,
      code: code.trim(),
    });
    if (error) {
      setPending(false);
      setError("הקוד שגוי או שפג תוקפו. נסו את הקוד הבא.");
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-5">
      {!factorId && !enrollment && !error && (
        <div className="flex h-52 items-center justify-center text-muted">
          <Spinner />
        </div>
      )}
      {!factorId && enrollment && (
        <div className="animate-rise flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL from Supabase */}
          <img
            src={enrollment.qrCode}
            alt="קוד QR לאפליקציית האימות"
            className="size-52 rounded-3xl bg-white p-3 shadow-[0_8px_32px_rgb(0_0_0/0.12)]"
          />
          {/* On a phone the QR can't be scanned from the same screen; the
              otpauth:// link opens the authenticator app directly. */}
          <a
            href={enrollment.uri}
            className={buttonClass({ variant: "glass", size: "sm", className: "md:hidden" })}
          >
            פתיחה באפליקציית האימות
          </a>
          <p className="text-center text-xs text-muted">
            לא מצליחים לסרוק? הזינו ידנית:{" "}
            <code dir="ltr" className="select-all break-all">
              {enrollment.secret}
            </code>
          </p>
        </div>
      )}
      <Label>
        קוד בן 6 ספרות
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          dir="ltr"
          className="h-14 text-center text-2xl font-semibold tracking-[0.5em]"
          required
        />
      </Label>
      <FormMessage error={error} />
      <Button type="submit" size="lg" loading={pending} disabled={!activeFactorId}>
        אימות
      </Button>
    </form>
  );
}
