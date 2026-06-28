import { useState } from "react";
import { LandingSectionFrame } from "./LandingSectionFrame";
import { AccordionItem, Reveal } from "./LandingMotion";
import { faqs } from "./landingData";

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <LandingSectionFrame
      eyebrow="FAQ"
      title="Answers shaped for decision-makers evaluating a serious operating platform"
      description="The FAQ keeps the page practical and conversion-friendly without cluttering the main visual flow."
    >
      <div className="mx-auto grid max-w-4xl gap-4">
        {faqs.map((faq, index) => (
          <Reveal key={faq.title} delay={index * 0.04} y={20}>
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
