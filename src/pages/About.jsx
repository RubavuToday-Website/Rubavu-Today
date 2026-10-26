import React from "react";
import { Link } from "react-router-dom";
import InfoPage, {
  InfoSection,
  InfoParagraph,
} from "../components/StaticPage/InfoPage";
import {
  useLanguage,
  translateCategory,
} from "../context/LanguageContext";

const CONTENT = {
  rw: {
    title: "Abo turi bo",
    lede: "Rubavu Today ni urubuga rw'amakuru rwa kijyambere rutanga amakuru yizerwa, inkuru, imyidagaduro, imikino, ubukungu n'amakuru y'abaturage bo muri Rubavu n'ahandi.",
    who: "Abo turi bo",
    whoText:
      "Rubavu Today yashyizweho kugira ngo abaturage bo mu karere ka Rubavu n'abandi babone amakuru mu buryo bwizewe, byihuse kandi butandukanije mu buzima bwa buri munsi. Dukora ku ruhande rw'abasoma bacu, tukabaha amakuru ahanzwe neza mu kinyarwanda, mu gifaransa, mu kiswahili no mu cyongereza.",
    what: "Ibitubereye",
    whatIntro: "Twamamaza amakuru mu byiciro bikurikira:",
    where: "Aho duherereye",
    whereText:
      "Rubavu, u Rwanda. Duhereza mu karere ka Rubavu, imitumba ya Volcanso (Virunga) n'i burengerazuba bw'u Rwanda, tugahura amakuru atandukanye y'ibice byinshi by'igihugu.",
  },
  en: {
    title: "About Us",
    lede: "Rubavu Today is a modern digital news platform delivering trusted news, stories, entertainment, sports, business and community updates from Rubavu and beyond.",
    who: "Who We Are",
    whoText:
      "Rubavu Today was created to give the people of Rubavu District and beyond reliable, timely and accessible news for everyday life. We work on the side of our readers, publishing carefully curated stories in Kinyarwanda, French, Kiswahili and English.",
    what: "What We Cover",
    whatIntro: "Rubavu Today reports across these categories:",
    where: "Where We Are",
    whereText:
      "Rubavu, Rwanda. We are based in Rubavu District, at the foot of the Virunga mountains in western Rwanda, connecting stories from across the country and the region.",
  },
  fr: {
    title: "À propos",
    lede: "Rubavu Today est une plateforme d'information numérique moderne qui vous propose des nouvelles fiables, des articles, du divertissement, du sport, des affaires et des actualités communautaires de Rubavu et d'ailleurs.",
    who: "Qui sommes-nous",
    whoText:
      "Rubavu Today a été créé pour offrir aux habitants du district de Rubavu et au-delà des informations fiables, opportunes et accessibles dans leur vie quotidienne. Nous publions des reportages soigneusement sélectionnés en kinyarwanda, en français, en kiswahili et en anglais.",
    what: "Ce que nous couvrons",
    whatIntro: "Rubavu Today informe à travers ces rubriques :",
    where: "Où nous trouver",
    whereText:
      "Rubavu, au Rwanda. Nous sommes basés dans le district de Rubavu, au pied des montagnes des Virunga, à l'ouest du Rwanda, reliant des histoires de tout le pays et de la région.",
  },
  sw: {
    title: "Kuhusu Sisi",
    lede: "Rubavu Today ni jukwaa la kisasa la habari za kidijitali linalokuletea habari za kuaminika, makala, burudani, michezo, biashara na taarifa za jamii kutoka Rubavu na nje yake.",
    who: "Sisi ni Nani",
    whoText:
      "Rubavu Today ilianzishwa kuwapa wakazi wa wilaya ya Rubavu na nje yake habari za kuaminika, za wakati na zinazoweza kufikiwa katika maisha ya kila siku. Tunachapisha habari zilizochaguliwa kwa uangalifu kwa Kinyarwanda, Kifaransa, Kiswahili na Kiingereza.",
    what: "Tunachotoa",
    whatIntro: "Rubavu Today inaripoti kwa kategoria hizi:",
    where: "Wapi Tulipo",
    whereText:
      "Rubavu, Rwanda. Tuko wilayani Rubavu, chini ya milima ya Virunga magharibi mwa Rwanda, kuunganisha habari za nchi na eneo lote.",
  },
};

const CATEGORY_NAMES = [
  "Amakuru",
  "Ubukungu",
  "Imikino",
  "Imyidagaduro",
  "Uburezi",
];

const About = () => {
  const { language, t } = useLanguage();
  const content = CONTENT[language] || CONTENT.en;

  return (
    <InfoPage title={content.title} lede={content.lede}>
      <InfoSection heading={content.who}>
        <InfoParagraph>{content.whoText}</InfoParagraph>
      </InfoSection>

      <InfoSection heading={content.what}>
        <InfoParagraph>{content.whatIntro}</InfoParagraph>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_NAMES.map((name) => (
            <li key={name}>
              <Link
                to={`/?category=${encodeURIComponent(name)}`}
                className="group flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[13px] font-semibold text-slate-800 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <span>{translateCategory(name, language)}</span>
                <span aria-hidden="true" className="text-slate-400 transition group-hover:text-red-600">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <InfoParagraph>
          <Link
            to={`/?category=${encodeURIComponent("Amakuru")}`}
            className="font-semibold text-red-600 hover:text-red-800"
          >
            {t("viewAll")} →
          </Link>
        </InfoParagraph>
      </InfoSection>

      <InfoSection heading={content.where}>
        <InfoParagraph>{content.whereText}</InfoParagraph>
      </InfoSection>
    </InfoPage>
  );
};

export default About;