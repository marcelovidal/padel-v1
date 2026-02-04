"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssessmentForm } from "@/components/assessments/AssessmentForm";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Match {
    id: string;
    match_at: string;
    club_name: string;
    // add other fields if needed for display
}

export function PendingAssessmentCard({ match, playerId }: { match: Match; playerId: string }) {
    const [showForm, setShowForm] = useState(false);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="text-base font-semibold">
                        {format(new Date(match.match_at), "PPP p", { locale: es })}
                    </CardTitle>
                    <p className="text-sm text-gray-500">{match.club_name}</p>
                </div>
                <Button
                    variant={showForm ? "outline" : "default"}
                    onClick={() => setShowForm(!showForm)}
                >
                    {showForm ? "Cancelar" : "Completar"}
                </Button>
            </CardHeader>
            {showForm && (
                <CardContent>
                    {/* @ts-ignore Server -> Client prop */}
                    <AssessmentForm matchId={match.id} playerId={playerId} />
                </CardContent>
            )}
        </Card>
    );
}
