export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-gray-200" />
          <div className="h-4 w-64 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-20 rounded-xl bg-gray-200" />
      </div>

      <div className="rounded-2xl border bg-white p-5 space-y-4">
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
        <div className="h-10 w-full rounded-xl bg-gray-200" />
        <div className="h-40 w-full rounded-xl bg-gray-100" />
      </div>

      <div className="rounded-2xl border bg-white p-5">
        <div className="h-4 w-72 rounded bg-gray-100" />
      </div>
    </div>
  );
}
