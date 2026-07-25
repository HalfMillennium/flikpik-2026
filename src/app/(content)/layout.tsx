import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Public content shell (blog / lists / picker). Uses the same responsive
 * Navbar as the app — which adapts to signed-out visitors and includes the
 * mobile hamburger drawer — plus the marketing footer.
 */
export default function ContentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
