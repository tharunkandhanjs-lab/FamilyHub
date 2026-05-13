interface FamilyMember {
  name: string;
  color: string;
  avatarEmoji: string;
}

interface MemberAvatarProps {
  member: FamilyMember;
  size?: "xs" | "sm" | "md" | "lg";
  showName?: boolean;
  className?: string;
}

export function MemberAvatar({
  member,
  size = "md",
  showName = false,
  className = "",
}: MemberAvatarProps) {
  const sizeClasses = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center shadow-md border border-border`}
        style={{ backgroundColor: member.color }}
      >
        <span className="select-none">{member.avatarEmoji}</span>
      </div>
      {showName && <span className="text-foreground">{member.name}</span>}
    </div>
  );
}
