export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex pt-5 flex-col">
      <h1 className="text-5xl font-alfaSlab text-center mb-24">bambino</h1>
      {children}
    </div>
  );
}
