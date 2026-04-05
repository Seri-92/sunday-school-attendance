type StudentNameProps = {
  firstName: string;
  firstNameKana: string;
  lastName: string;
  lastNameKana: string;
  className?: string;
  kanaClassName?: string;
  nameClassName?: string;
};

export function StudentName(props: StudentNameProps) {
  return (
    <div className={props.className}>
      <div
        className={`flex flex-wrap gap-x-3 gap-y-1 text-[0.7rem] leading-none text-zinc-500 ${
          props.kanaClassName ?? ""
        }`}
      >
        <span>{props.lastNameKana}</span>
        <span>{props.firstNameKana}</span>
      </div>
      <div className={`mt-1 flex flex-wrap gap-x-3 gap-y-1 ${props.nameClassName ?? ""}`}>
        <span>{props.lastName}</span>
        <span>{props.firstName}</span>
      </div>
    </div>
  );
}
