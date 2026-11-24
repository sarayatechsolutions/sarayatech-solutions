import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Insights = () => {
  const articles = [
    {
      category: "Cloud Computing",
      title: "The Future of Multi-Cloud Architecture in Enterprise",
      excerpt: "Explore how leading organizations are leveraging multi-cloud strategies to achieve unprecedented scalability and resilience.",
      date: "December 15, 2024",
      readTime: "8 min read",
      image: "bg-gradient-to-br from-primary to-primary-light"
    },
    {
      category: "Data Analytics",
      title: "Turning Data into Strategic Advantage",
      excerpt: "Learn how advanced analytics and AI are transforming raw data into actionable business intelligence.",
      date: "December 10, 2024",
      readTime: "6 min read",
      image: "bg-gradient-to-br from-accent to-accent-light"
    },
    {
      category: "Digital Transformation",
      title: "Enterprise Digital Transformation: A Roadmap",
      excerpt: "A comprehensive guide to successfully navigating digital transformation in large organizations.",
      date: "December 5, 2024",
      readTime: "10 min read",
      image: "bg-gradient-to-br from-primary-light to-accent"
    },
    {
      category: "Security",
      title: "Zero Trust Security in the Cloud Era",
      excerpt: "Understanding and implementing zero trust security models for modern cloud infrastructure.",
      date: "November 28, 2024",
      readTime: "7 min read",
      image: "bg-gradient-to-br from-secondary to-primary"
    },
    {
      category: "AI & Machine Learning",
      title: "AI-Powered Business Intelligence",
      excerpt: "How artificial intelligence is revolutionizing business decision-making and predictive analytics.",
      date: "November 20, 2024",
      readTime: "9 min read",
      image: "bg-gradient-to-br from-primary to-accent"
    },
    {
      category: "Industry Trends",
      title: "2025 Technology Trends for Enterprises",
      excerpt: "Key technology trends that will shape enterprise IT strategies in the coming year.",
      date: "November 15, 2024",
      readTime: "12 min read",
      image: "bg-gradient-to-br from-accent-light to-primary-light"
    }
  ];

  return (
    <div className="min-h-screen">
      <div>
        {/* Hero */}
        <section className="pt-32 pb-20 gradient-primary text-primary-foreground">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in-up">
              <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
                Insights & Resources
              </h1>
              <p className="text-xl md:text-2xl text-primary-foreground/90">
                Expert perspectives on enterprise technology, digital transformation, and innovation
              </p>
            </div>
          </div>
        </section>

        {/* Featured Article */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-card rounded-2xl overflow-hidden shadow-elegant border border-border">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="bg-gradient-to-br from-primary to-accent h-full min-h-[400px]" />
                <div className="p-8 md:p-12 flex flex-col justify-center">
                  <div className="inline-block bg-accent/10 text-accent rounded-full px-4 py-2 text-sm font-semibold mb-4 w-fit">
                    Featured Article
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    The Future of Multi-Cloud Architecture in Enterprise
                  </h2>
                  <p className="text-lg text-secondary mb-6 leading-relaxed">
                    Explore how leading organizations are leveraging multi-cloud strategies to achieve unprecedented scalability and resilience.
                  </p>
                  <div className="flex items-center space-x-6 mb-6 text-sm text-secondary">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" />
                      <span>December 15, 2024</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>8 min read</span>
                    </div>
                  </div>
                  <Button className="bg-primary hover:bg-primary-light shadow-card group w-fit">
                    Read Article
                    <ArrowRight className="ml-2 group-hover:translate-x-1 transition-smooth" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Articles Grid */}
        <section className="py-24 bg-muted/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold mb-12">Latest Articles</h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {articles.map((article) => (
                <article key={article.title} className="bg-card rounded-2xl overflow-hidden shadow-card border border-border hover:shadow-elegant transition-all group">
                  <div className={`h-48 ${article.image}`} />
                  <div className="p-6 space-y-4">
                    <div className="inline-block bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-semibold">
                      {article.category}
                    </div>
                    <h3 className="text-xl font-bold leading-tight group-hover:text-primary transition-smooth">
                      {article.title}
                    </h3>
                    <p className="text-secondary text-sm leading-relaxed">
                      {article.excerpt}
                    </p>
                    <div className="pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-xs text-secondary">
                        <div>
                          <div>{article.date}</div>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{article.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-primary to-primary-light rounded-2xl p-12 text-center text-primary-foreground">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Stay Informed</h2>
              <p className="text-xl mb-8 text-primary-foreground/90">
                Get the latest insights delivered to your inbox
              </p>
              <Link to="/contact">
                <Button size="lg" className="bg-accent hover:bg-accent-light text-accent-foreground shadow-accent">
                  Subscribe to Newsletter
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Insights;
