import AppSectionLabel from "@/components/shared/AppSectionLabel";
import SubtleBadge from "@/components/shared/SubtleBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  MotionStudioFieldDefinition,
  MotionStudioGuardrailIssue,
  MotionStudioTemplateDefinition,
} from "@/components/video/VideoStudioRemotionTemplates";

type AssetOption = {
  id: string;
  label: string;
  assetType: string;
};

const GROUP_ORDER = ["Setup", "Copy", "Timing", "Look", "Assets"] as const;

const asString = (value: unknown) => (typeof value === "string" ? value : "");
const asNumber = (value: unknown, fallback = 0) =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;
const asBoolean = (value: unknown) => value === true;

const getFieldIssues = (fieldId: string, issues: MotionStudioGuardrailIssue[]) =>
  issues.filter((issue) => issue.fieldId === fieldId);

const renderField = (
  field: MotionStudioFieldDefinition,
  value: unknown,
  onChange: (fieldId: string, nextValue: unknown) => void,
  assets: AssetOption[],
) => {
  if (field.kind === "textarea") {
    return (
      <Textarea
        value={asString(value)}
        onChange={(event) => onChange(field.id, event.target.value)}
        placeholder={field.placeholder}
        className="min-h-[96px] rounded-2xl"
      />
    );
  }

  if (field.kind === "text") {
    return (
      <Input
        value={asString(value)}
        onChange={(event) => onChange(field.id, event.target.value)}
        placeholder={field.placeholder}
        className="rounded-xl"
      />
    );
  }

  if (field.kind === "color") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-3">
        <input
          type="color"
          value={asString(value) || "#F59E0B"}
          onChange={(event) => onChange(field.id, event.target.value)}
          className="h-10 w-14 rounded-lg border border-[var(--border)] bg-transparent"
        />
        <Input
          value={asString(value)}
          onChange={(event) => onChange(field.id, event.target.value)}
          className="rounded-xl"
        />
      </div>
    );
  }

  if (field.kind === "boolean") {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3">
        <p className="text-sm text-[var(--text-secondary)]">{field.description || field.label}</p>
        <Switch checked={asBoolean(value)} onCheckedChange={(checked) => onChange(field.id, checked)} />
      </div>
    );
  }

  if (field.kind === "select") {
    return (
      <Select value={asString(value) || "none"} onValueChange={(nextValue) => onChange(field.id, nextValue)}>
        <SelectTrigger className="rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(field.options || []).map((option) => (
            <SelectItem key={`${field.id}-${option.value}`} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.kind === "asset") {
    const options = assets.filter((asset) =>
      field.assetKinds?.length ? field.assetKinds.some((kind) => asset.assetType === kind) : true,
    );

    return (
      <Select value={asString(value) || "none"} onValueChange={(nextValue) => onChange(field.id, nextValue === "none" ? "" : nextValue)}>
        <SelectTrigger className="rounded-xl">
          <SelectValue placeholder={options.length > 0 ? "Select asset" : "No compatible assets"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {options.map((asset) => (
            <SelectItem key={`${field.id}-${asset.id}`} value={asset.id}>
              {asset.label} ({asset.assetType})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const numericValue = asNumber(value, field.min || 0);
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-4">
      <div className="flex items-center justify-between text-sm text-[var(--text-secondary)]">
        <span>{field.label}</span>
        <span>{numericValue}</span>
      </div>
      <Slider
        value={[numericValue]}
        min={field.min}
        max={field.max}
        step={field.step || 1}
        onValueChange={(next) => onChange(field.id, next[0] ?? numericValue)}
      />
      <Input
        type="number"
        min={field.min}
        max={field.max}
        step={field.step || 1}
        value={numericValue}
        onChange={(event) => onChange(field.id, Number(event.target.value) || field.min || 0)}
        className="rounded-xl"
      />
    </div>
  );
};

export default function VideoStudioRemotionPropsPanel({
  template,
  values,
  issues,
  assets,
  onChange,
}: {
  template: MotionStudioTemplateDefinition;
  values: Record<string, unknown>;
  issues: MotionStudioGuardrailIssue[];
  assets: AssetOption[];
  onChange: (fieldId: string, nextValue: unknown) => void;
}) {
  return (
    <div className="space-y-6">
      {GROUP_ORDER.map((group) => {
        const fields = template.fieldDefinitions.filter((field) => field.group === group);
        if (fields.length === 0) return null;

        return (
          <div key={group} className="space-y-4">
            <AppSectionLabel>{group}</AppSectionLabel>

            {fields.map((field) => {
              const fieldIssues = getFieldIssues(field.id, issues);

              return (
                <div key={field.id} className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label>{field.label}</Label>
                      {field.description ? (
                        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{field.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {field.required ? <SubtleBadge variant="outline">Required</SubtleBadge> : null}
                      {fieldIssues.map((issue) => (
                        <SubtleBadge
                          key={`${field.id}-${issue.level}-${issue.message}`}
                          className={
                            issue.level === "error"
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-amber-200 bg-amber-50 text-amber-700"
                          }
                        >
                          {issue.level}
                        </SubtleBadge>
                      ))}
                    </div>
                  </div>

                  {renderField(field, values[field.id], onChange, assets)}

                  {fieldIssues.map((issue) => (
                    <p
                      key={`${field.id}-copy-${issue.level}-${issue.message}`}
                      className={
                        issue.level === "error"
                          ? "text-xs leading-5 text-rose-700"
                          : "text-xs leading-5 text-amber-700"
                      }
                    >
                      {issue.message}
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
