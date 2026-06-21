import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Stethoscope,
  MessageCircle,
  Loader2,
  Send,
  UserCircle,
  Paperclip,
  FileText,
  X,
} from "lucide-react";
import { Link, useSearch } from "wouter";
import Navigation from "@/components/Navigation";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ExpertInbox() {
  const { user, isAuthenticated, loading } = useAuth();
  const { language } = useLanguage();
  const isAr = language === "ar";
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialConvId = params.get("conv") ? Number(params.get("conv")) : null;

  const [selectedConvId, setSelectedConvId] = useState<number | null>(initialConvId);
  const [messageText, setMessageText] = useState("");
  const [pendingFile, setPendingFile] = useState<{ name: string; base64: string; mimeType: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const isExpert = user?.role === "expert";

  const { data: conversations, isLoading: convsLoading } = trpc.chat.myConversations.useQuery(undefined, {
    enabled: isAuthenticated && !isExpert,
    refetchInterval: 10000,
  });

  const { data: expertConversations, isLoading: expertConvsLoading } = trpc.chat.expertInbox.useQuery(undefined, {
    enabled: isAuthenticated && isExpert,
    refetchInterval: 10000,
  });

  const convList = isExpert ? expertConversations : conversations;
  const convsLoadingState = isExpert ? expertConvsLoading : convsLoading;

  const { data: messages, isLoading: msgsLoading } = trpc.chat.getMessages.useQuery(
    { conversationId: selectedConvId! },
    {
      enabled: selectedConvId !== null,
      refetchInterval: 5000,
    }
  );

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setMessageText("");
      setPendingFile(null);
      utils.chat.getMessages.invalidate({ conversationId: selectedConvId! });
      utils.chat.myConversations.invalidate();
      utils.chat.expertInbox.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const uploadFile = trpc.chat.uploadFile.useMutation({
    onError: (e) => toast.error(`${isAr ? "فشل الرفع" : "Upload failed"}: ${e.message}`),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!selectedConvId && convList && convList.length > 0) {
      setSelectedConvId(convList[0].id);
    }
  }, [convList, selectedConvId]);

  const handleSend = async () => {
    if ((!messageText.trim() && !pendingFile) || !selectedConvId) return;

    if (pendingFile) {
      setIsUploading(true);
      try {
        const result = await uploadFile.mutateAsync({
          conversationId: selectedConvId,
          fileName: pendingFile.name,
          fileBase64: pendingFile.base64,
          mimeType: pendingFile.mimeType,
        });
        await sendMessage.mutateAsync({
          conversationId: selectedConvId,
          content: messageText.trim(),
          fileUrl: result.url,
          fileName: result.fileName,
        });
      } finally {
        setIsUploading(false);
      }
    } else {
      sendMessage.mutate({ conversationId: selectedConvId, content: messageText.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error(isAr ? "يُدعم فقط ملفات PDF والصور" : "Only PDF and image files are supported");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error(isAr ? "يجب أن يكون الملف أقل من 10 ميغابايت" : "File must be under 10 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setPendingFile({ name: file.name, base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  type UserConv = { id: number; expertId: number; lastMessageAt: Date; expertName: string | null; expertSpecialty: string | null };
  type ExpertConv = { id: number; userId: number; lastMessageAt: Date; userName: string | null; userEmail: string | null };

  const selectedConv = convList?.find((c) => c.id === selectedConvId) as UserConv | ExpertConv | undefined;
  const getOtherName = (conv: UserConv | ExpertConv) => isExpert ? (conv as ExpertConv).userName : (conv as UserConv).expertName;
  const getSpecialty = (conv: UserConv | ExpertConv) => isExpert ? null : (conv as UserConv).expertSpecialty;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Card className="max-w-md w-full mx-4">
            <CardContent className="pt-8 pb-8 text-center">
              <MessageCircle className="w-12 h-12 text-cyan-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">
                {isAr ? "سجّل الدخول لعرض الرسائل" : "Sign in to view messages"}
              </h2>
              <a href="/login">
                <Button className="bg-cyan-500 hover:bg-cyan-600">
                  {isAr ? "تسجيل الدخول" : "Sign In"}
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!isExpert && user?.role !== "user" && user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-500">{isAr ? "غير مصرح بالوصول." : "Access denied."}</p>
        </div>
      </div>
    );
  }

  const isSending = sendMessage.isPending || isUploading;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navigation />

      <main className="flex-1 pt-20">
        <section className="bg-gradient-to-r from-teal-700 to-teal-900 text-white py-8">
          <div className="container">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {isExpert
                    ? (isAr ? "صندوق وارد الخبير" : "Expert Inbox")
                    : (isAr ? "محادثاتي" : "My Conversations")}
                </h1>
                <p className="text-teal-200 text-sm">
                  {isExpert
                    ? (isAr ? "الرد على المستخدمين الباحثين عن إرشادات صحية" : "Respond to users seeking health guidance")
                    : (isAr ? "محادثاتك مع خبراء الصحة" : "Your conversations with health experts")}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-6">
          <div className="container max-w-5xl">
            {!isExpert && (
              <div className="mb-4">
                <Link href="/experts">
                  <Button variant="outline" size="sm" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                    <Stethoscope className="w-4 h-4 mr-1" />
                    {isAr ? "البحث عن مزيد من الخبراء" : "Find More Experts"}
                  </Button>
                </Link>
              </div>
            )}

            {convsLoadingState ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
              </div>
            ) : !convList || convList.length === 0 ? (
              <div className="text-center py-20">
                <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-gray-700 mb-2">
                  {isAr ? "لا توجد محادثات بعد" : "No conversations yet"}
                </h2>
                {!isExpert && (
                  <p className="text-gray-500 text-sm mb-6">
                    {isAr ? (
                      <>ابدأ محادثة بمراسلة خبير من صفحة{" "}
                        <Link href="/experts" className="text-teal-600 underline">البحث عن الخبراء</Link>.
                      </>
                    ) : (
                      <>Start a conversation by messaging an expert from the{" "}
                        <Link href="/experts" className="text-teal-600 underline">Find Experts</Link> page.
                      </>
                    )}
                  </p>
                )}
                {isExpert && (
                  <p className="text-gray-500 text-sm">
                    {isAr ? "سيظهر المستخدمون هنا عندما يراسلونك." : "Users will appear here when they message you."}
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
                {/* Conversations list */}
                <div className="md:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-y-auto">
                  <div className="p-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-700">
                      {isExpert ? (isAr ? "المستخدمون" : "Users") : (isAr ? "الخبراء" : "Experts")} ({convList.length})
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {convList.map((conv) => {
                      const typedConv = conv as UserConv | ExpertConv;
                      const other = getOtherName(typedConv);
                      const specialty = getSpecialty(typedConv);
                      const isSelected = conv.id === selectedConvId;
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConvId(conv.id)}
                          className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                            isSelected ? "bg-teal-50 border-l-2 border-l-teal-500" : ""
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                              <UserCircle className="w-5 h-5 text-teal-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {other || (isAr ? "مجهول" : "Unknown")}
                              </p>
                              {specialty && (
                                <p className="text-xs text-teal-600 truncate">{specialty}</p>
                              )}
                              <p className="text-xs text-gray-400">
                                {new Date(conv.lastMessageAt).toLocaleDateString(isAr ? "ar-SA" : "en-US")}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Chat area */}
                <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                  {!selectedConvId ? (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">{isAr ? "اختر محادثة" : "Select a conversation"}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Chat header */}
                      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-teal-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {selectedConv
                              ? getOtherName(selectedConv as UserConv | ExpertConv) || (isExpert ? (isAr ? "مستخدم" : "User") : (isAr ? "خبير" : "Expert"))
                              : (isExpert ? (isAr ? "مستخدم" : "User") : (isAr ? "خبير" : "Expert"))}
                          </p>
                          {!isExpert && selectedConv && getSpecialty(selectedConv as UserConv | ExpertConv) && (
                            <Badge className="bg-teal-100 text-teal-700 border-teal-200 text-xs">
                              {getSpecialty(selectedConv as UserConv | ExpertConv)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {msgsLoading ? (
                          <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
                          </div>
                        ) : !messages || messages.length === 0 ? (
                          <div className="text-center py-8 text-gray-400">
                            <p className="text-sm">{isAr ? "لا توجد رسائل بعد. قل مرحباً!" : "No messages yet. Say hello!"}</p>
                          </div>
                        ) : (
                          messages.map((msg) => {
                            const isMine = msg.senderId === user?.id;
                            return (
                              <div
                                key={msg.id}
                                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                    isMine
                                      ? "bg-teal-600 text-white rounded-br-sm"
                                      : "bg-gray-100 text-gray-800 rounded-bl-sm"
                                  }`}
                                >
                                  {msg.content && (
                                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                                  )}
                                  {msg.fileUrl && (
                                    <a
                                      href={msg.fileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className={`flex items-center gap-2 mt-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                                        isMine
                                          ? "bg-teal-500 hover:bg-teal-400 text-white"
                                          : "bg-white hover:bg-gray-50 text-teal-700 border border-gray-200"
                                      }`}
                                    >
                                      <FileText className="w-4 h-4 flex-shrink-0" />
                                      <span className="truncate max-w-[180px]">
                                        {msg.fileName || (isAr ? "مرفق" : "Attachment")}
                                      </span>
                                    </a>
                                  )}
                                  <p className={`text-xs mt-1 ${isMine ? "text-teal-200" : "text-gray-400"}`}>
                                    {new Date(msg.createdAt).toLocaleTimeString(isAr ? "ar-SA" : "en-US", { hour: "2-digit", minute: "2-digit" })}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Pending file preview */}
                      {pendingFile && (
                        <div className="px-4 pb-2">
                          <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-sm text-teal-700">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="flex-1 truncate">{pendingFile.name}</span>
                            <button
                              onClick={() => setPendingFile(null)}
                              className="text-teal-500 hover:text-teal-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Input */}
                      <div className="p-4 border-t border-gray-100">
                        <div className="flex gap-2 items-end">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="application/pdf,image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="self-end border-gray-200 text-gray-500 hover:text-teal-600 hover:border-teal-300"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSending}
                            title={isAr ? "إرفاق PDF أو صورة" : "Attach PDF or image"}
                          >
                            <Paperclip className="w-4 h-4" />
                          </Button>
                          <Textarea
                            className="flex-1 resize-none min-h-[44px] max-h-32 text-sm"
                            placeholder={isAr ? "اكتب رسالة... (Enter للإرسال، Shift+Enter لسطر جديد)" : "Type a message… (Enter to send, Shift+Enter for new line)"}
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            rows={1}
                          />
                          <Button
                            className="bg-teal-600 hover:bg-teal-700 self-end"
                            size="sm"
                            onClick={handleSend}
                            disabled={(!messageText.trim() && !pendingFile) || isSending}
                          >
                            {isSending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">
                          {isAr ? "إرفاق ملفات PDF أو صور حتى 10 ميغابايت" : "Attach PDF or image files up to 10 MB"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
