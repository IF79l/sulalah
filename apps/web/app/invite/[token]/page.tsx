export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  await params;
  // The token is verified on the server before any tree data is shown.
  return <main className="p-8">رابط دعوة (قيد البناء)</main>;
}
