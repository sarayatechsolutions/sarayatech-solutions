import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import chatbotService from "@/services/chatbot.service";
import openAIService from "@/services/openai.service";

/**
 * ChatbotDebugPanel
 * Admin panel to monitor and control chatbot mode
 * Only show in development or admin pages
 */
const ChatbotDebugPanel = () => {
  const [status, setStatus] = useState(chatbotService.getStatus());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setStatus(chatbotService.getStatus());
    }, 2000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  const handleToggleMode = () => {
    const newMode = status.mode === 'ChatGPT';
    chatbotService.toggleMode(!newMode);
    setStatus(chatbotService.getStatus());
  };

  const handleResetConversation = () => {
    chatbotService.resetConversation();
    setStatus(chatbotService.getStatus());
  };

  const handleRefresh = () => {
    setStatus(chatbotService.getStatus());
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chatbot Debug Panel</span>
          <Badge variant={status.mode === 'ChatGPT' ? 'default' : 'secondary'}>
            {status.mode}
          </Badge>
        </CardTitle>
        <CardDescription>
          Monitor and control Amina chatbot behavior
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Section */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Status</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Current Mode</p>
              <p className="font-medium">{status.mode}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">OpenAI Available</p>
              <p className="font-medium">
                {status.openAIAvailable ? (
                  <Badge variant="default" className="bg-green-600">✓ Yes</Badge>
                ) : (
                  <Badge variant="secondary">✗ No</Badge>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        {status.openAIAvailable && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">OpenAI Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Context Tokens</p>
                <p className="font-medium text-accent">{status.stats.contextTokens}</p>
                <p className="text-xs text-muted-foreground">
                  (~75% savings with Toon encoding)
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Conversation Length</p>
                <p className="font-medium">{status.stats.conversationLength} messages</p>
              </div>
            </div>
          </div>
        )}

        {/* Controls Section */}
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Controls</h3>
          <div className="flex flex-col gap-3">
            {/* Mode Toggle */}
            {status.openAIAvailable && (
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">ChatGPT Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Use AI for natural responses
                  </p>
                </div>
                <Switch
                  checked={status.mode === 'ChatGPT'}
                  onCheckedChange={handleToggleMode}
                />
              </div>
            )}

            {/* Reset Conversation */}
            <Button
              variant="outline"
              onClick={handleResetConversation}
              className="w-full"
              disabled={!status.openAIAvailable}
            >
              Reset Conversation History
            </Button>

            {/* Refresh Stats */}
            <Button
              variant="outline"
              onClick={handleRefresh}
              className="w-full"
            >
              Refresh Stats
            </Button>

            {/* Auto-refresh toggle */}
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Auto-refresh</p>
                <p className="text-xs text-muted-foreground">
                  Update stats every 2 seconds
                </p>
              </div>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
          </div>
        </div>

        {/* Info Section */}
        {!status.openAIAvailable && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              OpenAI not configured
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Set <code className="bg-yellow-100 dark:bg-yellow-800 px-1 rounded">VITE_OPENAI_API_KEY</code> in .env file to enable ChatGPT mode
            </p>
          </div>
        )}

        {/* Token Economy Info */}
        {status.openAIAvailable && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              💡 Token Economy with Toon
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Toon encoding reduces context tokens by ~75%
              <br />
              Standard JSON: ~1800 tokens → Toon: ~{status.stats.contextTokens} tokens
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ChatbotDebugPanel;
