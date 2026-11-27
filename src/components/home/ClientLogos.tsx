import {
  Building2,
  Factory,
  Hospital,
  Landmark,
  ShoppingCart,
  Plane,
} from "lucide-react";

const ClientLogos = () => {
  const clients = [
    { name: "Fortune 500 Bank", icon: Landmark },
    { name: "Global Manufacturer", icon: Factory },
    { name: "Healthcare Leader", icon: Hospital },
    { name: "Retail Giant", icon: ShoppingCart },
    { name: "Aviation Corp", icon: Plane },
    { name: "Tech Enterprise", icon: Building2 },
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-semibold text-secondary uppercase tracking-wider mb-12">
          Trusted by Industry Leaders Worldwide
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 items-center">
          {clients.map((client) => {
            const Icon = client.icon;
            return (
              <div
                key={client.name}
                className="flex flex-col items-center justify-center p-6 group"
              >
                <Icon className="w-12 h-12 text-secondary/60 group-hover:text-primary transition-colors duration-fast ease-standard mb-2" />
                <span className="text-xs text-secondary/80 text-center font-medium">
                  {client.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ClientLogos;
