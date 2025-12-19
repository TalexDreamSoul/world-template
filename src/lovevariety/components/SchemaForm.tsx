import { useEffect } from "react";
import { Button, Input, Label, Textarea, Toggle } from "./common/index.ts";

// Simplified JSON Schema type definition for our UI needs
export interface JSONSchema {
  type?: "string" | "number" | "integer" | "boolean" | "object" | "array";
  description?: string;
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  enum?: (string | number)[];
  default?: unknown;
  "x-multiline"?: boolean;
  required?: string[];
}

interface SchemaFormProps {
  schema: JSONSchema;
  value: unknown;
  onChange: (value: unknown) => void;
  label?: string;
  required?: boolean;
}

interface DefaultResetControlProps {
  required: boolean;
  isUndefined: boolean;
  onReset: () => void;
  className?: string;
}

function DefaultResetControl({
  required,
  isUndefined,
  onReset,
  className,
}: DefaultResetControlProps) {
  if (required) return null;
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      {isUndefined ? (
        <span className="bg-ctp-surface0 text-ctp-overlay1 rounded px-1 text-xs">
          默认
        </span>
      ) : (
        <button
          onClick={onReset}
          className="text-ctp-red text-xs hover:underline"
        >
          重置
        </button>
      )}
    </div>
  );
}

export function SchemaForm({
  schema,
  value,
  onChange,
  label,
  required,
}: SchemaFormProps) {
  // Initialize default value if undefined
  useEffect(() => {
    if (value !== undefined) return;
    if (required) {
      if (schema.default !== undefined) {
        onChange(schema.default);
      } else {
        if (schema.type === "object") onChange({});
        else if (schema.type === "array") onChange([]);
        else if (schema.type === "boolean") onChange(false);
        else if (schema.type === "string") onChange("");
        else if (schema.type === "number" || schema.type === "integer")
          onChange(0);
      }
    }
  }, [schema, value, onChange, required]);

  const defaultValue = getDefaultValue(schema);
  const isUndefined = value === undefined;
  const effectiveValue = isUndefined ? defaultValue : value;

  const Header = () => (
    <div className="mb-1 flex items-center justify-between">
      {label && <Label>{label}</Label>}
      <DefaultResetControl
        required={required || false}
        isUndefined={isUndefined}
        onReset={() => onChange(undefined)}
      />
    </div>
  );

  const description = schema.description ? (
    <p className="text-ctp-subtext0 mb-2 text-sm">{schema.description}</p>
  ) : null;

  // Handle Enum
  if (schema.enum) {
    return (
      <div>
        <Header />
        {description}
        <select
          value={effectiveValue as string | number}
          onChange={(e) => {
            const val = e.target.value;
            // Try to convert back to number if the enum contains numbers
            const numVal = Number(val);
            if (!isNaN(numVal) && schema.enum?.some((v) => v === numVal)) {
              onChange(numVal);
            } else {
              onChange(val);
            }
          }}
          className={`border-ctp-surfac1 focus:border-ctp-mauve focus:ring-ctp-mauve mt-1 block w-full rounded-md border bg-transparent px-3 py-2 shadow-sm focus:outline-none ${
            isUndefined ? "text-ctp-overlay1" : ""
          }`}
        >
          {schema.enum.map((option) => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  switch (schema.type) {
    case "string":
      return (
        <div>
          <Header />
          {description}
          {schema["x-multiline"] ? (
            <Textarea
              value={effectiveValue as string}
              onChange={onChange}
              rows={3}
              className={`w-full ${isUndefined ? "text-ctp-overlay1" : ""}`}
            />
          ) : (
            <Input
              value={effectiveValue as string}
              onChange={onChange}
              className={`w-full ${isUndefined ? "text-ctp-overlay1" : ""}`}
            />
          )}
        </div>
      );

    case "number":
    case "integer":
      return (
        <div>
          <Header />
          {description}
          <Input
            type="number"
            value={String(effectiveValue)}
            onChange={(val) => onChange(Number(val))}
            className={`w-full ${isUndefined ? "text-ctp-overlay1" : ""}`}
          />
        </div>
      );

    case "boolean":
      return (
        <div>
          <Toggle
            checked={effectiveValue as boolean}
            onChange={onChange}
            label={
              <div className="flex w-full items-center justify-between">
                <div>
                  {label && <div className="font-medium">{label}</div>}
                  {schema.description && (
                    <div className="text-ctp-subtext0 text-sm">
                      {schema.description}
                    </div>
                  )}
                </div>
                <DefaultResetControl
                  required={required || false}
                  isUndefined={isUndefined}
                  onReset={() => onChange(undefined)}
                  className="ml-4"
                />
              </div>
            }
          />
        </div>
      );

    case "object":
      return (
        <div className="border-ctp-surface1 rounded-lg border p-4">
          <Header />
          {description}
          <div className="flex flex-col gap-4">
            {Object.entries(schema.properties || {}).map(
              ([propName, propSchema]) => (
                <SchemaForm
                  key={propName}
                  schema={propSchema}
                  value={(effectiveValue as Record<string, unknown>)[propName]}
                  onChange={(newValue) =>
                    onChange({
                      ...(effectiveValue as Record<string, unknown>),
                      [propName]: newValue,
                    })
                  }
                  label={propName}
                  required={schema.required?.includes(propName)}
                />
              ),
            )}
          </div>
        </div>
      );

    case "array":
      return (
        <div className="border-ctp-surface0 rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="grow">
              <div className="flex items-center gap-2">
                {label && (
                  <h3 className="text-ctp-text font-medium">
                    {label} ({(effectiveValue as unknown[]).length})
                  </h3>
                )}
                <DefaultResetControl
                  required={required || false}
                  isUndefined={isUndefined}
                  onReset={() => onChange(undefined)}
                />
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                // Add default item
                const newItem = getDefaultValue(schema.items);
                onChange([...(effectiveValue as unknown[]), newItem]);
              }}
              className="text-sm"
            >
              添加
            </Button>
          </div>
          {description}
          <div className="flex flex-col gap-4">
            {(effectiveValue as unknown[]).map((item, index) => (
              <div key={index} className="flex items-start gap-2">
                <div className="grow">
                  <SchemaForm
                    schema={schema.items || {}}
                    value={item}
                    onChange={(newItem) => {
                      const newArray = [...(effectiveValue as unknown[])];
                      newArray[index] = newItem;
                      onChange(newArray);
                    }}
                    required={true}
                  />
                </div>
                <Button
                  variant="danger"
                  onClick={() => {
                    const newArray = (effectiveValue as unknown[]).filter(
                      (_: unknown, i: number) => i !== index,
                    );
                    onChange(newArray);
                  }}
                  className="mt-1 px-2 py-1 text-xs"
                >
                  删除
                </Button>
              </div>
            ))}
          </div>
        </div>
      );

    default:
      return (
        <div className="text-red-500">
          Unsupported type: {schema.type} for {label}
        </div>
      );
  }
}

function getDefaultValue(schema?: JSONSchema): unknown {
  if (!schema) return undefined;
  if (schema.default !== undefined) return schema.default;
  if (schema.type === "string") return "";
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "boolean") return false;
  if (schema.type === "object") return {};
  if (schema.type === "array") return [];
  if (schema.enum && schema.enum.length > 0) return schema.enum[0];
  return undefined;
}
