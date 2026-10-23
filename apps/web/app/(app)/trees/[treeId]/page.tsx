export default async function TreePage({ params }: { params: Promise<{ treeId: string }> }) {
  const { treeId } = await params;
  return <main className="p-8">محرر الشجرة {treeId} (قيد البناء)</main>;
}
