export default function DeleteError({ message }) {
  if (!message) {
    return null;
  }

  return (
    <div className="mt-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}
