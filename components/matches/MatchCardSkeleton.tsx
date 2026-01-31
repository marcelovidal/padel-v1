import React from "react";

export default function MatchCardSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-pulse">
            <div className="p-5">
                {/* Header Skeleton */}
                <div className="flex justify-between items-start mb-6">
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                        <div className="h-6 bg-gray-200 rounded w-48"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded-full w-20"></div>
                </div>

                {/* Results Table Skeleton */}
                <div className="mb-6 overflow-hidden rounded-lg border border-gray-100">
                    <div className="bg-gray-50 h-8"></div>
                    <div className="divide-y divide-gray-50">
                        <div className="h-12 bg-white"></div>
                        <div className="h-12 bg-white"></div>
                    </div>
                </div>

                {/* Footer Skeleton */}
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center gap-4">
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                        <div className="h-3 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="h-9 bg-gray-200 rounded-lg w-28"></div>
                </div>
            </div>
        </div>
    );
}
