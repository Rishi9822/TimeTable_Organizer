import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import API from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/useToast";

import { Key, Copy, Plus, Loader2, Trash2 } from "lucide-react";

const InviteCodesCard = () => {
  const { user, institutionId } = useAuth();
  const { toast } = useToast();

  const [codes, setCodes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [maxUses, setMaxUses] = useState(5);

  const fetchCodes = async () => {
    if (!institutionId) return;

    try {
      const res = await API.get(
        `/institutions/${institutionId}/invite-codes`
      );
      setCodes(res.data || []);
    } catch (error) {
      console.error("Error fetching codes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [institutionId]);

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCode = async () => {
    if (!institutionId || !user) return;

    setIsGenerating(true);
    const newCode = generateCode();

    try {
      await API.post("/institutions/invite-codes", {
        institutionId,
        code: newCode,
        maxUses: maxUses > 0 ? maxUses : null,
      });

      toast({
        title: "Code Generated!",
        description: `Invite code ${newCode} has been created.`,
      });

      await fetchCodes();
    } catch (error) {
      console.error("Error generating code:", error);
      toast({
        title: "Error",
        description: "Failed to generate invite code.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard.",
    });
  };

  const handleDeleteCode = async (id) => {
    try {
      await API.delete(`/institutions/invite-codes/${id}`);
      toast({
        title: "Deleted",
        description: "Invite code has been removed.",
      });
      setCodes((prev) => prev.filter((c) => c._id !== id));
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete code.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center mb-2">
          <Key className="h-5 w-5 text-secondary-foreground" />
        </div>
        <CardTitle className="text-lg">Invite Codes</CardTitle>
        <CardDescription>
          Generate codes for schedulers to join your institution
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Generate */}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label htmlFor="maxUses" className="text-xs">
              Max Uses
            </Label>
            <Input
              id="maxUses"
              type="number"
              min="1"
              max="100"
              value={maxUses}
              onChange={(e) =>
                setMaxUses(parseInt(e.target.value, 10) || 1)
              }
              className="h-9"
            />
          </div>
          <Button
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Generate
          </Button>
        </div>

        {/* List */}
        {codes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No invite codes yet. Generate one above.
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {codes.map((code) => {
              const isMaxedOut =
                code.maxUses && code.usesCount >= code.maxUses;
              const isValid = code.isActive && !isMaxedOut;

              return (
                <div
                  key={code._id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50 gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="font-mono text-sm font-medium tracking-wider">
                      {code.code}
                    </code>
                    <Badge
                      variant={isValid ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {code.usesCount}/{code.maxUses || "∞"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopyCode(code.code)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => handleDeleteCode(code._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InviteCodesCard;
