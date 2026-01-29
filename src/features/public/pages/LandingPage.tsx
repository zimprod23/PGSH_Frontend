import { Box } from "@mantine/core";
import { PublicNavbar } from "../components/PublicNavbar";
import { Hero } from "../components/Hero";
import { Features } from "../components/Features";
import { ContactSection } from "../components/ContactSection";
import { PublicFooter } from "../components/PublicFooter";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function LandingPage() {
  const { hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        // Timeout ensures the DOM is fully painted before scrolling
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    }
  }, [hash]);

  return (
    <Box id="accueil">
      {" "}
      {/* Added ID for 'Accueil' scrolling */}
      <PublicNavbar />
      <Hero />
      <Box bg="gray.0">
        <Features />
      </Box>
      <ContactSection />
      <PublicFooter />
    </Box>
  );
}
