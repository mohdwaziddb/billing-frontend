import { useState } from "react";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { AccordionItem, Reveal } from "./LandingMotion";
import { faqs } from "./landingData";

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <LandingSectionFrame
      eyebrow="FAQ"
      title="Answers that reduce uncertainty before the first login"
      description="Clear, practical questions around fit, access, company setup, and communication capabilities."
    >
      <div className="mx-auto grid max-w-4xl gap-4">
        {faqs.map((faq, index) => (
          <Reveal key={faq.title} delay={index * 40}>
            <AccordionItem
              title={faq.title}
              content={faq.content}
              open={openIndex === index}
              onToggle={() => setOpenIndex((current) => (current === index ? -1 : index))}
            />
          </Reveal>
        ))}
      </div>
    </LandingSectionFrame>
  );
};
