import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles,
  Key,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trash2,
  RefreshCw,
  Cpu,
  Layers,
  ExternalLink,
} from "lucide-react";
import { getApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AIProviderConfig,
  AIProviderId,
  AIUserSettings,
} from "@open-sunsama/types";

export const aiQueryKeys = {
  settings: ["ai", "settings"] as const,
  providers: ["ai", "providers"] as const,
  history: ["ai", "history"] as const,
};

export function AiSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: aiData, isLoading } = useQuery({
    queryKey: aiQueryKeys.settings,
    queryFn: () => getApi().ai.getSettings(),
  });

  const { data: providersList } = useQuery({
    queryKey: aiQueryKeys.providers,
    queryFn: () => getApi().ai.getProviders(),
  });

  const settings = aiData?.settings;
  const configs = aiData?.configs || [];

  const updateSettingsMutation = useMutation({
    mutationFn: (updates: Partial<AIUserSettings>) =>
      getApi().ai.updateSettings(updates),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.settings });
      toast({ title: "AI preferences updated" });
    },
    onError: (err) => {
      toast({
        variant: "destructive",
        title: "Could not update AI preferences",
        description: err instanceof Error ? err.message : "Try again",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        Loading AI settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">AI & Providers</h2>
        <p className="text-sm text-muted-foreground">
          Configure your personal AI keys for Knowledge Check generation, study planning, and learning assistance.
        </p>
      </div>

      {/* Global AI Feature Switch */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Enable AI Features
              </CardTitle>
              <CardDescription>
                Allow StudyOS to provide AI-assisted quizzes, study planning suggestions, and tutoring.
              </CardDescription>
            </div>
            <Switch
              checked={settings?.aiEnabled ?? true}
              onCheckedChange={(checked) =>
                updateSettingsMutation.mutate({ aiEnabled: checked })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Primary Provider</Label>
              <Select
                value={settings?.defaultProvider || "gemini"}
                onValueChange={(val) =>
                  updateSettingsMutation.mutate({
                    defaultProvider: val as AIProviderId,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select primary provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gemini">Google AI Studio (Gemini)</SelectItem>
                  <SelectItem value="groq">Groq (Ultra-fast)</SelectItem>
                  <SelectItem value="nim">NVIDIA NIM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Provider Fallback</Label>
                <Switch
                  checked={settings?.allowFallback ?? true}
                  onCheckedChange={(checked) =>
                    updateSettingsMutation.mutate({ allowFallback: checked })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                If the primary provider experiences a rate limit or timeout, automatically try configured fallback providers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Provider Cards */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Provider Configurations
        </h3>

        {(["gemini", "groq", "nim"] as AIProviderId[]).map((providerId) => {
          const config = configs.find((c) => c.provider === providerId);
          const meta = providersList?.find((p) => p.id === providerId);
          return (
            <ProviderCard
              key={providerId}
              providerId={providerId}
              config={config}
              meta={meta}
              onUpdated={() => {
                void queryClient.invalidateQueries({ queryKey: aiQueryKeys.settings });
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ProviderCardProps {
  providerId: AIProviderId;
  config?: AIProviderConfig;
  meta?: {
    id: AIProviderId;
    displayName: string;
    defaultModel: string;
    models: { id: string; name: string }[];
  };
  onUpdated: () => void;
}

function ProviderCard({ providerId, config, meta, onUpdated }: ProviderCardProps) {
  const { toast } = useToast();
  const [keyInput, setKeyInput] = React.useState("");
  const [customEndpoint, setCustomEndpoint] = React.useState(config?.customEndpoint || "");
  const [selectedModel, setSelectedModel] = React.useState(
    config?.defaultModel || meta?.defaultModel || ""
  );
  const [isEditingKey, setIsEditingKey] = React.useState(!config?.hasKey);
  const [isTesting, setIsTesting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (config?.defaultModel) {
      setSelectedModel(config.defaultModel);
    } else if (meta?.defaultModel) {
      setSelectedModel(meta.defaultModel);
    }
    if (config?.customEndpoint) {
      setCustomEndpoint(config.customEndpoint);
    }
  }, [config, meta]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await getApi().ai.updateProvider(providerId, {
        apiKey: keyInput.trim() ? keyInput.trim() : undefined,
        defaultModel: selectedModel || null,
        customEndpoint: customEndpoint.trim() || null,
        isEnabled: true,
      });
      toast({ title: `${meta?.displayName || providerId} settings saved` });
      setKeyInput("");
      setIsEditingKey(false);
      onUpdated();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not save provider",
        description: err instanceof Error ? err.message : "Try again",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const res = await getApi().ai.testProvider(providerId, {
        apiKey: keyInput.trim() ? keyInput.trim() : undefined,
        customEndpoint: customEndpoint.trim() || null,
      });
      if (res.ok) {
        toast({
          title: "Connection successful!",
          description: `Verified connection to ${meta?.displayName}. Found ${res.models?.length || 0} models.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Connection test failed",
          description: res.error || "Verify your API key and try again.",
        });
      }
      onUpdated();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Test connection error",
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await getApi().ai.deleteProvider(providerId);
      toast({ title: `${meta?.displayName || providerId} key removed` });
      setKeyInput("");
      setIsEditingKey(true);
      onUpdated();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not remove key",
        description: err instanceof Error ? err.message : "Try again",
      });
    }
  };

  const getStatusBadge = () => {
    if (!config?.hasKey) {
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Not configured
        </Badge>
      );
    }
    if (config.status === "verified") {
      return (
        <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-600 text-white">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Verified
        </Badge>
      );
    }
    if (config.status === "error") {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" /> Error
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="text-xs">
        Configured
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">{meta?.displayName || providerId}</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          {providerId === "gemini" && "Get an API key from Google AI Studio (generativelanguage.googleapis.com)"}
          {providerId === "groq" && "Get a lightning-fast inference API key from console.groq.com"}
          {providerId === "nim" && "Use NVIDIA NIM cloud endpoints (build.nvidia.com) or self-hosted microservices"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* API Key Row */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold">API Key</Label>
          {config?.hasKey && !isEditingKey ? (
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono flex items-center justify-between">
                <span>{config.keyMask || "••••••••••••••••"}</span>
                <span className="text-[11px] text-muted-foreground">Encrypted at rest</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingKey(true)}
              >
                Change
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Input
                type="password"
                placeholder={providerId === "gemini" ? "AIzaSy..." : providerId === "groq" ? "gsk_..." : "nvapi-..."}
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="font-mono text-sm"
              />
              {config?.hasKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingKey(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Model Selection Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Default Model</Label>
            <Select
              value={selectedModel}
              onValueChange={setSelectedModel}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {(meta?.models || []).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {providerId === "nim" && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Custom Endpoint (Optional)</Label>
              <Input
                placeholder="https://integrate.api.nvidia.com/v1"
                value={customEndpoint}
                onChange={(e) => setCustomEndpoint(e.target.value)}
                className="text-sm font-mono"
              />
            </div>
          )}
        </div>

        {config?.lastError && (
          <div className="p-2.5 rounded-md bg-destructive/10 text-destructive text-xs flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{config.lastError}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          {(config?.hasKey || keyInput.trim()) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={isTesting || (!config?.hasKey && !keyInput.trim())}
            >
              {isTesting ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Testing...
                </>
              ) : (
                "Test Connection"
              )}
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || (!keyInput.trim() && !isEditingKey && selectedModel === config?.defaultModel)}
          >
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
