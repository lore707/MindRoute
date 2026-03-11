export interface ImageOption {
  src: string;
  label: string;
  sub: string;
  value: string;
}

export interface TextQuestion {
  text: string;
  hint: string;
  type: "text";
  placeholder: string;
  why: string;
  tags: string[];
  section: string;
  optional?: boolean;
}

export interface ChipsQuestion {
  text: string;
  hint: string;
  type: "chips";
  options: string[];
  multi: boolean;
  max?: number;
  addendum?: string;
  why: string;
  tags: string[];
  section: string;
}

export interface ImagesQuestion {
  text: string;
  hint: string;
  type: "images";
  options: ImageOption[];
  why: string;
  tags: string[];
  section: string;
}

export interface SliderQuestion {
  text: string;
  hint: string;
  type: "slider";
  why: string;
  tags: string[];
  section: string;
}

export type Question = TextQuestion | ChipsQuestion | ImagesQuestion | SliderQuestion;
export type Translate = (key: string) => string;
