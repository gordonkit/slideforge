import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";
import { textValue } from "../../schemas/fields.js";

/** People: a round portrait (or the name's first letter), the name, the role, and a line of text. */
export function TeamLayout({ slide }: LayoutProps<"team">) {
  return <ul className="sf-team" data-count={slide.members.length}>{slide.members.map((member, index) => <li className="sf-member" key={index}>
    {member.image === undefined
      ? <span className="sf-avatar" aria-hidden="true">{Array.from(textValue(member.name))[0]?.toUpperCase()}</span>
      : <img className="sf-avatar" src={member.image} alt={textValue(member.name)} />}
    <span className="sf-member-name"><DisplayTextContent value={member.name} size="card-title" /></span>
    {member.role && <span className="sf-member-role"><DisplayTextContent value={member.role} size="card-body" /></span>}
    {member.text && <span className="sf-member-text"><DisplayTextContent value={member.text} size="card-body" scale={0.85} /></span>}
  </li>)}</ul>;
}
