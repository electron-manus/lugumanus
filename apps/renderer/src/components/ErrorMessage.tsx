interface ErrorMessagesProps {
  errors: Record<string, string[] | undefined>;
}

export function ErrorMessages({ errors }: ErrorMessagesProps) {
  return (
    <div className="text-red-500 mb-2">
      {Object.entries(errors).map(([field, messages]) => (
        <div key={field}>
          {field.toUpperCase()}: {messages?.join(', ')}
        </div>
      ))}
    </div>
  );
}
