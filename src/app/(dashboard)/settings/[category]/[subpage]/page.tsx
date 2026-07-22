import { notFound } from "next/navigation";
import Link from "next/link";
import { SETTINGS_CATEGORIES } from "@/lib/settings/settings-config";
import { SETTINGS_SCHEMAS } from "@/lib/settings/settings-schemas";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{
    category: string;
    subpage: string;
  }>;
}

export default async function SettingsSubPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { category: categorySlug, subpage: subpageSlug } = resolvedParams;

  const currentCategory = SETTINGS_CATEGORIES.find(
    (c) => c.slug === categorySlug,
  );
  if (!currentCategory) notFound();

  const currentSubItem = currentCategory.items.find(
    (i) => i.slug === subpageSlug,
  );
  if (!currentSubItem) notFound();

  const schema = SETTINGS_SCHEMAS[subpageSlug] || {
    title: currentSubItem.title,
    description: `Manage configuration parameters for ${currentSubItem.title.toLowerCase()}.`,
    fields: [
      {
        id: "defaultField",
        label: currentSubItem.title,
        type: "text",
        placeholder: "Enter value...",
      },
    ],
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar Navigation */}
      <div className="lg:col-span-1">
        <div className="sticky top-6 bg-card rounded-2xl border border-border p-3 shadow-sm">
          <nav className="space-y-0.5">
            {currentCategory.items.map((item) => {
              const isActive = item.slug === subpageSlug;
              return (
                <Link
                  key={item.slug}
                  href={`/settings/${currentCategory.slug}/${item.slug}`}
                  className={cn(
                    "group relative flex items-center px-3 py-2.5 text-sm rounded-xl transition-all duration-150",
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/20"
                      : "text-muted-foreground font-medium hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="border-border shadow-sm rounded-2xl overflow-hidden py-0 gap-0">
          <CardHeader className="border-b border-border bg-muted/30 py-6">
            <CardTitle className="text-xl font-bold tracking-tight text-foreground">
              {schema.title}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground leading-relaxed">
              {schema.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-8 p-6 sm:p-8">
            {schema.fields.map((field: any) => {
              if (field.type === "text") {
                return (
                  <div key={field.id} className="space-y-2">
                    <Label
                      htmlFor={field.id}
                      className="text-sm font-semibold text-foreground"
                    >
                      {field.label}
                    </Label>
                    <Input
                      id={field.id}
                      placeholder={field.placeholder}
                      className="h-11 rounded-lg focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                    />
                  </div>
                );
              }

              if (field.type === "select") {
                return (
                  <div key={field.id} className="space-y-2">
                    <Label
                      htmlFor={field.id}
                      className="text-sm font-semibold text-foreground"
                    >
                      {field.label}
                    </Label>
                    <div className="relative">
                      <select
                        id={field.id}
                        name={field.id}
                        defaultValue={field.defaultValue || field.value || ""}
                        className="w-full appearance-none rounded-lg  px-4 py-2.5 pr-10 text-sm font-medium text-foreground shadow-sm cursor-pointer transition-colors  focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-background"
                      >
                        {field.options?.map((opt: any) => (
                          <option
                            key={opt.value}
                            value={opt.value}
                            className="bg-card text-foreground"
                          >
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" />
                    </div>
                  </div>
                );
              }

              // 3. Toggle Switch Renderer
              if (field.type === "toggle") {
                return (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border transition-colors hover:bg-muted/60"
                  >
                    <div className="space-y-0.5 pr-4">
                      <Label className="text-sm font-semibold text-foreground">
                        {field.label}
                      </Label>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Enable or configure execution state.
                      </p>
                    </div>
                    <Switch
                      defaultChecked={field.defaultValue}
                      className="data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                );
              }

              // 4. File Upload Asset Renderer
              if (field.type === "file") {
                return (
                  <div
                    key={field.id}
                    className="bg-muted/40 border border-dashed border-border rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors hover:border-indigo-300 dark:hover:border-indigo-800"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-14 h-14 rounded-full bg-card border border-border flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs shrink-0">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {field.label}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          .png, .jpg, or .svg — up to 5MB
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                      >
                        Upload
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </CardContent>

          {/* Action Buttons */}
          <div className="px-6 sm:px-8 py-5 border-t border-border bg-muted/30 flex justify-end gap-3">
            <Button variant="outline" className="rounded-lg">
              Cancel
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm shadow-indigo-600/20">
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
