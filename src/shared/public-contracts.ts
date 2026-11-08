import type { Infer,publicControlSchema,publicCommandSchema,publicDrawingSchema,publicViewSchema,publicResultSchema,publicTextResultsSchema,publicUiSchema,publicEffectSchema,publicDialogSchema,publicActionSchema,publicSettingsSchema } from './public-schemas';
import type { publicLayoutSchema,publicOptionSchema,publicSearchHitSchema } from './public-schemas';
import type { publicDrawingPresentationSchema } from './public-schemas';
// Public schema is independent of all private engine types; types follow schema.
export type SearchHit=Infer<typeof publicSearchHitSchema>;
export type PublicLegacyControl=Infer<typeof publicControlSchema>;
export type PublicLayout=Infer<typeof publicLayoutSchema>;
export type PublicLegacyOption=Infer<typeof publicOptionSchema>;
export type PublicDrawCommand=Infer<typeof publicCommandSchema>;
export type PublicDrawing=Infer<typeof publicDrawingSchema>;
export type PublicDrawingPresentation=Infer<typeof publicDrawingPresentationSchema>;
export type PublicTextResults=Infer<typeof publicTextResultsSchema>;
export type PublicLegacyView=Infer<typeof publicViewSchema>;
export type PublicWorkResult=Infer<typeof publicResultSchema>;
export type PublicWorkspaceUi=Infer<typeof publicUiSchema>;
export type PublicUiEffect=Infer<typeof publicEffectSchema>;
export type PublicDialog=Infer<typeof publicDialogSchema>;
export type PublicWorkAction=Infer<typeof publicActionSchema>;
export type PublicSettings=Infer<typeof publicSettingsSchema>;
