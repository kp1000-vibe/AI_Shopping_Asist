interface JsonLdProps {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  id?: string;
}

/**
 * Structured data. `<` is escaped so a product title can never break out of the
 * script element.
 */
export function JsonLd({ data, id }: JsonLdProps) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      id={id}
      // The payload is JSON we generated and escaped ourselves.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
