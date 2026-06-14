import { z } from "zod";

export const productDisclosureSections = [
  {
    id: "curatorsNote",
    label: "Curator's Note",
    fields: [
      { id: "selectionReason", label: "Selection reason" },
      { id: "bestFor", label: "Best for" },
      { id: "moodFinish", label: "Mood / finish" }
    ]
  },
  {
    id: "formulaBreakdown",
    label: "Formula Breakdown",
    fields: [
      { id: "keyIngredients", label: "Key ingredients" },
      { id: "ingredientRole", label: "Ingredient role" },
      { id: "textureFormulaNote", label: "Texture / formula note" }
    ]
  },
  {
    id: "careCautions",
    label: "Care & Cautions",
    fields: [
      { id: "skinUseCautions", label: "Skin / use cautions" },
      { id: "storageNotes", label: "Storage notes" },
      { id: "regulatoryNote", label: "Regulatory note" }
    ]
  },
  {
    id: "beforeYouBuy",
    label: "Before You Buy",
    fields: [
      { id: "shippingNote", label: "Shipping note" },
      { id: "customsFees", label: "Customs / fees" },
      { id: "returnsNote", label: "Returns note" }
    ]
  }
] as const;

export type ProductDisclosureSectionId = (typeof productDisclosureSections)[number]["id"];

export type ProductDisclosureNotes = {
  curatorsNote: {
    selectionReason: string;
    bestFor: string;
    moodFinish: string;
  };
  formulaBreakdown: {
    keyIngredients: string;
    ingredientRole: string;
    textureFormulaNote: string;
  };
  careCautions: {
    skinUseCautions: string;
    storageNotes: string;
    regulatoryNote: string;
  };
  beforeYouBuy: {
    shippingNote: string;
    customsFees: string;
    returnsNote: string;
  };
};

type DisclosureSectionValue<TSectionId extends ProductDisclosureSectionId> =
  ProductDisclosureNotes[TSectionId];

const disclosureTextSchema = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z.string().transform(normalizeDisclosureText)
);

const disclosureSectionSchemas = {
  curatorsNote: z
    .preprocess(
      objectOrEmpty,
      z
        .object({
          selectionReason: disclosureTextSchema,
          bestFor: disclosureTextSchema,
          moodFinish: disclosureTextSchema
        })
        .strict()
    ),
  formulaBreakdown: z
    .preprocess(
      objectOrEmpty,
      z
        .object({
          keyIngredients: disclosureTextSchema,
          ingredientRole: disclosureTextSchema,
          textureFormulaNote: disclosureTextSchema
        })
        .strict()
    ),
  careCautions: z
    .preprocess(
      objectOrEmpty,
      z
        .object({
          skinUseCautions: disclosureTextSchema,
          storageNotes: disclosureTextSchema,
          regulatoryNote: disclosureTextSchema
        })
        .strict()
    ),
  beforeYouBuy: z
    .preprocess(
      objectOrEmpty,
      z
        .object({
          shippingNote: disclosureTextSchema,
          customsFees: disclosureTextSchema,
          returnsNote: disclosureTextSchema
        })
        .strict()
    )
};

export const productDisclosureNotesSchema = z
  .preprocess(
    objectOrEmpty,
    z
      .object(disclosureSectionSchemas)
      .strict()
  );

export type ProductDisclosureNotesInput = z.input<typeof productDisclosureNotesSchema>;

export function createEmptyProductDisclosureNotes(): ProductDisclosureNotes {
  return {
    curatorsNote: {
      selectionReason: "",
      bestFor: "",
      moodFinish: ""
    },
    formulaBreakdown: {
      keyIngredients: "",
      ingredientRole: "",
      textureFormulaNote: ""
    },
    careCautions: {
      skinUseCautions: "",
      storageNotes: "",
      regulatoryNote: ""
    },
    beforeYouBuy: {
      shippingNote: "",
      customsFees: "",
      returnsNote: ""
    }
  };
}

export function normalizeProductDisclosureNotes(value: unknown): ProductDisclosureNotes | undefined {
  if (value == null) {
    return undefined;
  }

  const parsed = productDisclosureNotesSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function normalizeProductDisclosureNotesForStorage(value: unknown) {
  return normalizeProductDisclosureNotes(value) ?? null;
}

export function hasCompleteProductDisclosureNotes(
  value: ProductDisclosureNotes | undefined
): value is ProductDisclosureNotes {
  return getIncompleteProductDisclosureFields(value).length === 0;
}

export function getIncompleteProductDisclosureFields(
  value: ProductDisclosureNotes | undefined
) {
  const notes = value ?? createEmptyProductDisclosureNotes();
  const missing: Array<{
    sectionId: ProductDisclosureSectionId;
    sectionLabel: string;
    fieldId: string;
    fieldLabel: string;
  }> = [];

  productDisclosureSections.forEach((section) => {
    section.fields.forEach((field) => {
      const sectionValue = notes[section.id] as DisclosureSectionValue<typeof section.id>;
      const fieldValue = sectionValue[field.id as keyof typeof sectionValue];

      if (!String(fieldValue ?? "").trim()) {
        missing.push({
          sectionId: section.id,
          sectionLabel: section.label,
          fieldId: field.id,
          fieldLabel: field.label
        });
      }
    });
  });

  return missing;
}

function normalizeDisclosureText(value: string) {
  return value.replace(/\r\n?/g, "\n").trim();
}

function objectOrEmpty(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
