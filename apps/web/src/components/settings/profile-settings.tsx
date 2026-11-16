import * as React from "react";
import { useForm } from "react-hook-form";
import { Loader2, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUploadAvatar, validateAvatarFile } from "@/hooks/useUploadAvatar";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui";
import { toast } from "@/hooks/use-toast";
import { cn, getAvatarUrl } from "@/lib/utils";

interface ProfileForm {
  name: string;
  email: string;
  timezone: string;
}

export const COMMON_TIMEZONES = [
  // India & South Asia (Featured)
  { value: "Asia/Kolkata", label: "India Standard Time - IST (New Delhi, Mumbai, Bengaluru, Kolkata) [UTC+05:30]" },
  { value: "Asia/Colombo", label: "Sri Lanka Standard Time (Colombo) [UTC+05:30]" },
  { value: "Asia/Dhaka", label: "Bangladesh Standard Time (Dhaka) [UTC+06:00]" },
  { value: "Asia/Kathmandu", label: "Nepal Time (Kathmandu) [UTC+05:45]" },
  { value: "Asia/Karachi", label: "Pakistan Standard Time (Karachi) [UTC+05:00]" },
  { value: "Asia/Dubai", label: "Gulf Standard Time - GST (Dubai, Abu Dhabi) [UTC+04:00]" },

  // Asia-Pacific
  { value: "Asia/Singapore", label: "Singapore Time - SGT (Singapore) [UTC+08:00]" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time - HKT (Hong Kong) [UTC+08:00]" },
  { value: "Asia/Tokyo", label: "Japan Standard Time - JST (Tokyo) [UTC+09:00]" },
  { value: "Asia/Seoul", label: "Korea Standard Time - KST (Seoul) [UTC+09:00]" },
  { value: "Asia/Bangkok", label: "Indochina Time - ICT (Bangkok, Jakarta) [UTC+07:00]" },
  { value: "Australia/Sydney", label: "Australian Eastern Time - AEST (Sydney, Melbourne) [UTC+10:00]" },
  { value: "Australia/Perth", label: "Australian Western Time - AWST (Perth) [UTC+08:00]" },
  { value: "Pacific/Auckland", label: "New Zealand Time - NZST (Auckland) [UTC+12:00]" },

  // Europe & Africa
  { value: "Europe/London", label: "London / Dublin - GMT/BST [UTC+00:00/+01:00]" },
  { value: "Europe/Paris", label: "Central European Time - Paris, Berlin, Rome [UTC+01:00/+02:00]" },
  { value: "Europe/Berlin", label: "Central European Time - Berlin, Frankfurt [UTC+01:00/+02:00]" },
  { value: "Europe/Amsterdam", label: "Central European Time - Amsterdam [UTC+01:00/+02:00]" },
  { value: "Europe/Athens", label: "Eastern European Time - Athens, Bucharest [UTC+02:00/+03:00]" },
  { value: "Africa/Cairo", label: "Eastern European Time - Cairo [UTC+02:00]" },
  { value: "Africa/Johannesburg", label: "South Africa Standard Time (Johannesburg) [UTC+02:00]" },

  // Americas
  { value: "America/New_York", label: "Eastern Time - US & Canada (New York, Toronto) [UTC-05:00]" },
  { value: "America/Chicago", label: "Central Time - US & Canada (Chicago, Dallas) [UTC-06:00]" },
  { value: "America/Denver", label: "Mountain Time - US & Canada (Denver, Phoenix) [UTC-07:00]" },
  { value: "America/Los_Angeles", label: "Pacific Time - US & Canada (Los Angeles, Vancouver) [UTC-08:00]" },
  { value: "America/Anchorage", label: "Alaska Time (Anchorage) [UTC-09:00]" },
  { value: "America/Honolulu", label: "Hawaii-Aleutian Time (Honolulu) [UTC-10:00]" },
  { value: "America/Sao_Paulo", label: "Brasília Time (São Paulo) [UTC-03:00]" },

  // Universal
  { value: "UTC", label: "Coordinated Universal Time (UTC) [UTC+00:00]" },
];

/**
 * Profile settings component for updating user personal information
 */
export function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const uploadAvatarMutation = useUploadAvatar();

  const detectedTimezone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "Asia/Kolkata";
    }
  }, []);

  const allTimezones = React.useMemo(() => {
    if (detectedTimezone && !COMMON_TIMEZONES.some((tz) => tz.value === detectedTimezone)) {
      return [
        { value: detectedTimezone, label: `${detectedTimezone} (Device Detected)` },
        ...COMMON_TIMEZONES,
      ];
    }
    return COMMON_TIMEZONES;
  }, [detectedTimezone]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      timezone: user?.timezone || detectedTimezone || "Asia/Kolkata",
    },
  });

  React.useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? "",
        email: user.email ?? "",
        timezone: user.timezone || detectedTimezone || "Asia/Kolkata",
      });
    }
  }, [user, detectedTimezone, reset]);

  const userInitials = React.useMemo(() => {
    if (!user?.name) return user?.email?.charAt(0).toUpperCase() ?? "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file before uploading
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      toast({
        variant: "destructive",
        title: "Invalid file",
        description: validation.error,
      });
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Upload the file
    uploadAvatarMutation.mutate(file, {
      onSettled: () => {
        // Reset the input so the same file can be selected again if needed
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      },
    });
  };

  const isUploadingAvatar = uploadAvatarMutation.isPending;

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      await updateUser({
        name: data.name,
        timezone: data.timezone,
      });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description:
          error instanceof Error ? error.message : "Could not update profile",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update your personal information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-4">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload avatar"
            />
            
            {/* Clickable avatar with hover overlay */}
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={isUploadingAvatar}
              className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Change avatar"
            >
              <Avatar className="h-20 w-20">
                <AvatarImage src={getAvatarUrl(user?.avatarUrl)} />
                <AvatarFallback className="text-lg">{userInitials}</AvatarFallback>
              </Avatar>
              
              {/* Hover overlay with camera icon */}
              <div
                className={cn(
                  "absolute inset-0 flex items-center justify-center rounded-full transition-opacity",
                  "bg-black/60 dark:bg-black/70",
                  isUploadingAvatar
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                )}
              >
                {isUploadingAvatar ? (
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                ) : (
                  <Camera className="h-6 w-6 text-white" />
                )}
              </div>
            </button>
            
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAvatarClick}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Change Avatar"
                )}
              </Button>
              <p className="mt-1 text-xs text-muted-foreground">
                JPG, PNG or GIF. Max 2MB.
              </p>
            </div>
          </div>

          <Separator />

          {/* Form Fields */}
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                {...register("name", { required: "Name is required" })}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timezone">Timezone</Label>
              <select
                id="timezone"
                {...register("timezone")}
                disabled={isLoading}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {allTimezones.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isLoading || !isDirty}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default ProfileSettings;
