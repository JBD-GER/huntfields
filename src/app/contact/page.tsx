import { ContactForm } from "@/components/forms/contact-form";
import { pageMetadata } from "@/lib/seo/site";

export const metadata = pageMetadata({
  title: "Contact Huntfields",
  description:
    "Contact Huntfields operations about land listings, marketplace access, partnerships, and support.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#c76b2f]">
          Contact
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-normal text-stone-950">
          Talk to Huntfields operations.
        </h1>
        <p className="mt-4 text-base leading-7 text-stone-600">
          Use this for marketplace support, landowner onboarding, data quality,
          regional compliance questions, and partnership conversations.
        </p>
      </div>
      <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
        <ContactForm />
      </section>
    </div>
  );
}
