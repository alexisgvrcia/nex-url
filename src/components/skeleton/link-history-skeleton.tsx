import Card from "@/components/ui/card";

export default function LinkHistorySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-4 mb-3">
                <div className="h-6 bg-gray-200 dark:bg-zinc-700 rounded w-24"></div>
              </div>

              <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-full mb-3"></div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-20"></div>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-zinc-700 rounded"></div>
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-16"></div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-4">
              <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded"></div>
              <div className="h-8 w-8 bg-gray-200 dark:bg-zinc-700 rounded"></div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
