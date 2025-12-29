import { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AminaChatbot from "@/components/chatbot/AminaChatbot";

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen">
      <Header />
      <main>{children}</main>
      <Footer />
      <AminaChatbot />
    </div>
  );
};

export default Layout;
