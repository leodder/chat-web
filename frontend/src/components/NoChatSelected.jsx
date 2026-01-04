import React from "react";
import { MessageSquare } from "lucide-react";

const NoChatSelected = () => {
  return (
    <div className="w-full flex flex-col items-center justify-center p-16 bg-base-100/50">
      <div className="max-w-md text-center space-y-6">
        {/* Icon display */}
        <div className="flex justify-center gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
          </div>
        </div>
        {/* Welcome Text */}
        <h2 className="text-2xl fontbold">Welcome to Chatty!</h2>
        <p className="text-base-content/60">Select a conversation from the sidebar to start chatting.</p>
      </div>
    </div>
  );
};

export default NoChatSelected;
