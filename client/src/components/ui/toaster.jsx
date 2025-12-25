import { useToast } from "@/hooks/useToast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <>
      {toasts.map(({ id, title, description }) => (
        <div key={id}>
          {title}
          {description}
        </div>
      ))}
    </>
  );
}
