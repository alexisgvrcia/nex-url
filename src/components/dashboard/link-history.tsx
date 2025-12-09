"use client";

import {
  Calendar,
  Download,
  ExternalLink,
  Eye,
  Plus,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLinksContext } from "@/providers/links-provider";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import CopyButton from "@/components/ui/copy-button";
import DeleteButton from "@/components/ui/delete-button";
import Input from "@/components/ui/input";
import AddLink from "./add-link";
import LinkHistorySkeleton from "@/components/skeleton/link-history-skeleton";
import { appConfig } from "@/config";

export default function LinkHistory() {
  const { links, loading, error, deleteLink } = useLinksContext();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [deletingLinks, setDeletingLinks] = useState<Set<string>>(new Set());
  const [isAddLinkModalOpen, setIsAddLinkModalOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportLinks = () => {
    if (loading || links.length === 0) return;

    toast.promise(
      new Promise((resolve) => {
        setIsExporting(true);
        const exportData = links.map((link) => ({
          originalUrl: link.originalUrl,
          shortUrl: `${appConfig.deployUrl}/${link.customAlias}`,
          alias: link.customAlias,
          clicks: link.clicks,
          createdAt: link.createdAt.toISOString(),
        }));

        const exportStats = {
          totalLinks: links.length,
          totalClicks: links.reduce((sum, link) => sum + link.clicks, 0),
          exportedAt: new Date().toISOString(),
        };

        const fullExport = {
          metadata: exportStats,
          links: exportData,
        };

        const dataStr = JSON.stringify(fullExport, null, 2);
        const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

        const exportFileDefaultName = `nex-url-export-${new Date().toISOString().split("T")[0]}.json`;

        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
        resolve("Links exported successfully!");
      }),
      {
        loading: "Exporting links...",
        success: () => {
          setIsExporting(false);
          return "Links exported successfully!";
        },
        error: "Failed to export links",
        finally: () => setIsExporting(false)
      },
    );
  };

  const filteredLinks = useMemo(() => {
    if (!searchTerm) return links;

    return links.filter(
      (link) =>
        link.originalUrl.toLowerCase().includes(searchTerm.toLowerCase()) ||
        link.customAlias.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [links, searchTerm]);

  const handleDeleteLink = async (linkId: string) => {
    setDeletingLinks((prev) => new Set([...prev, linkId]));

    toast.promise(deleteLink(linkId), {
      loading: "Deleting link...",
      success: () => {
        setDeletingLinks((prev) => {
          const newSet = new Set(prev);
          newSet.delete(linkId);
          return newSet;
        });

        return "Link deleted successfully";
      },
      error: "Failed to delete link",
    });
  };

  return (
    <div className="h-full flex flex-col p-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl mb-4 text-black dark:text-white">My Links</h2>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setIsAddLinkModalOpen(true)}
              className="mb-4"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
            <Button
              onClick={handleExportLinks}
              className="mb-4"
              disabled={loading || links.length === 0 || isExporting}
            >
              <Download className="h-4 w-4" />
              <span>{isExporting ? "Exporting..." : "Export"}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <Input
          type="text"
          placeholder="Search links..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="h-4 w-4" />}
          className="max-w-md"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <LinkHistorySkeleton />
        ) : error ? (
          <Card className="p-12 text-center">
            <p className="text-red-600 dark:text-red-400 font-normal text-lg">
              {error}
            </p>
          </Card>
        ) : filteredLinks.length === 0 ? (
          <Card className="p-12 text-center">
            {searchTerm ? (
              <>
                <p className="text-black/70 dark:text-white/70 font-normal text-lg">
                  No links found
                </p>
                <p className="text-black/50 dark:text-white/50 font-normal text-sm mt-2">
                  Try different search terms
                </p>
              </>
            ) : (
              <>
                <p className="text-black/70 dark:text-white/70 font-normal text-lg">
                  You haven&apos;t created any links yet
                </p>
                <p className="text-black/50 dark:text-white/50 font-normal text-sm mt-2">
                  Create your first link using the form above
                </p>
              </>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredLinks.map((link) => {
              const isDeleting = deletingLinks.has(link.id);

              return (
                <Card
                  key={link.id}
                  className={`p-6 group transition-opacity duration-200 ${
                    isDeleting ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-3">
                        <h3 className="text-lg font-normal text-black dark:text-white truncate">
                          /{link.customAlias}
                        </h3>
                      </div>

                      <p className="text-black/70 dark:text-white/70 mb-3 font-normal truncate">
                        {link.originalUrl}
                      </p>

                      <div className="flex items-center space-x-6 text-sm text-black/50 dark:text-white/50 font-normal">
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-2" />
                          {new Date(link.createdAt).toLocaleDateString("en-US")}
                        </span>
                        <span className="flex items-center">
                          <Eye className="h-4 w-4 mr-2" />
                          {link.clicks.toLocaleString()} clicks
                        </span>
                      </div>
                    </div>

                    <div
                      className={`flex items-center space-x-2 ml-4 opacity-60 group-hover:opacity-100 transition-opacity duration-200 ${
                        isDeleting ? "pointer-events-none opacity-30" : ""
                      }`}
                    >
                      <CopyButton
                        textToCopy={`${appConfig.deployUrl}/${link.customAlias}`}
                        disabled={isDeleting}
                      />

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link.originalUrl, "_blank")}
                        disabled={isDeleting}
                        title={
                          isDeleting ? "Deleting..." : "Open original link"
                        }
                        className="hover:scale-105 transition-transform duration-200"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>

                      <DeleteButton
                        onDelete={() => handleDeleteLink(link.id)}
                        disabled={isDeleting}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {searchTerm && filteredLinks.length > 0 && (
        <div className="mt-4 text-center border-t border-gray-200 dark:border-white/10 pt-4">
          <p className="text-black/50 dark:text-white/50 font-normal text-sm">
            Showing {filteredLinks.length} of {links.length} links
          </p>
        </div>
      )}

      <AddLink
        isOpen={isAddLinkModalOpen}
        onClose={() => setIsAddLinkModalOpen(false)}
      />
    </div>
  );
}
