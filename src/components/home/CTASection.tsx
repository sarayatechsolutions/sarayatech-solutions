import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24 gradient-hero text-primary-foreground relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%, white), 
                           linear-gradient(45deg, white 25%, transparent 25%, transparent 75%, white 75%, white)`,
            backgroundSize: "60px 60px",
            backgroundPosition: "0 0, 30px 30px",
          }}
        />
      </div>

      <div className="container relative mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
            Ready to Transform Your Enterprise?
          </h2>

          <p className="text-xl md:text-2xl text-primary-foreground/90 leading-relaxed max-w-2xl mx-auto">
            Websites, apps and custom software for growing businesses.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Link to="/contact">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent text-lg px-8 h-14 group"
              >
                <Calendar className="mr-2" size={20} />
                Schedule a Demo
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-smooth" />
              </Button>
            </Link>
            <Link to="/contact">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 text-lg px-8 h-14 backdrop-blur-sm"
              >
                Contact Sales Team
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="pt-12 flex flex-col sm:flex-row items-center justify-center gap-8 text-primary-foreground/90">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gold rounded-full" />
              <span className="text-sm">No commitment required</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gold rounded-full" />
              <span className="text-sm">Response within 24 hours</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gold rounded-full" />
              <span className="text-sm">Free consultation</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
