// import { ArrowLeft, Database, Radio, Settings } from "lucide-react";
// import Link from "next/link";
// import { ApiTrigger } from "@/components/ApiTrigger";
// import { Header } from "@/components/header";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Separator } from "@/components/ui/separator";
// import { getDirectoryRoutes } from "@/lib/routes-registry";
// import { tags } from "@/openapi/tags";

// const tagIcons: Record<string, React.ReactNode> = {
//   Registry: <Database className="h-5 w-5" />,
//   Gateway: <Radio className="h-5 w-5" />,
//   Internal: <Settings className="h-5 w-5" />,
// };

// export default function DirectoryPage() {
//   const routesByTag = getDirectoryRoutes();

//   return (
//     <div className="min-h-screen bg-background">
//       <Header />

//       <section className="container mx-auto px-4 py-8">
//         <div className="mb-12">
//           <Button variant="ghost" asChild className="mb-4">
//             <Link href="/">
//               <ArrowLeft className="mr-2 h-4 w-4" />
//               Back to Home
//             </Link>
//           </Button>
//           <h1 className="text-5xl font-black tracking-tight">API Directory</h1>
//           <p className="mt-3 text-lg font-light text-muted-foreground">
//             Test ONDC API endpoints with preset payloads
//           </p>
//         </div>

//         <div className="space-y-12">
//           {tags.map((tag, index) => {
//             const routes = routesByTag[tag.name];
//             if (!routes?.length) return null;

//             return (
//               <div key={tag.name}>
//                 {index > 0 && (
//                   <Separator className="mb-12 border-2 border-foreground" />
//                 )}
//                 <div className="rounded-xl border-2 border-foreground bg-card p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
//                   <div className="mb-6 flex items-center gap-3">
//                     <Badge
//                       variant="secondary"
//                       className="flex items-center gap-2 border-2 border-foreground px-3 py-1.5 text-sm font-semibold"
//                     >
//                       {tagIcons[tag.name]}
//                       {tag.name}
//                     </Badge>
//                     <span className="text-sm font-medium text-muted-foreground">
//                       {routes.length} endpoint{routes.length > 1 ? "s" : ""}
//                     </span>
//                   </div>
//                   <p className="mb-6 text-sm font-light leading-relaxed text-muted-foreground">
//                     {tag.description}
//                   </p>
//                   <div className="grid gap-4 md:grid-cols-2">
//                     {routes.map((route) => (
//                       <ApiTrigger
//                         key={route.path}
//                         title={route.directoryConfig.title}
//                         description={route.directoryConfig.description}
//                         endpoint={route.path}
//                         method={route.method.toUpperCase() as "GET" | "POST"}
//                         payload={route.directoryConfig.payload}
//                       />
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       </section>
//     </div>
//   );
// }

export default function DirectoryPage() {
  return <div>WIP</div>;
}
