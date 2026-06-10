import StudentHeader from "@/components/StudentHeader";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <StudentHeader />
      <main className="flex-1 w-full max-w-6xl mx-auto px-5 py-8 md:py-12">
        {children}
      </main>
      <footer className="border-t border-[color:var(--color-border)] py-6">
        <div className="max-w-6xl mx-auto px-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[color:var(--color-muted)]">
          <span>
            ATBU Smart Bus · Abubakar Tafawa Balewa University, Bauchi
          </span>
          <span>© {new Date().getFullYear()}</span>
        </div>
      </footer>
    </>
  );
}
