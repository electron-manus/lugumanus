export default function ChatLogo() {
  return (
    <div className="flex items-center">
      <img src="/logo.png" draggable={false} alt="logo" className="w-8 h-8 object-contain" />
      <div className="pl-2">
        <div className="font-medium text-base text-gray-200">麓咕 Manus</div>
      </div>
    </div>
  );
}
