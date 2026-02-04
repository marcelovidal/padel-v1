import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PlayerStats {
    played: number;
    wins: number;
    losses: number;
    balance: number;
}

export function PlayerStatsCards({ stats }: { stats: PlayerStats }) {
    const getBalanceInfo = (balance: number) => {
        if (balance > 0) return { icon: TrendingUp, color: "text-green-600", label: "Positivo" };
        if (balance < 0) return { icon: TrendingDown, color: "text-red-600", label: "Negativo" };
        return { icon: Minus, color: "text-gray-500", label: "Neutro" };
    };

    const { icon: BalanceIcon, color: balanceColor, label: balanceLabel } = getBalanceInfo(stats.balance);

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Jugados</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.played}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Ganados</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{stats.wins}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Perdidos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{stats.losses}</div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Balance</CardTitle>
                    <BalanceIcon className={`h-4 w-4 ${balanceColor}`} />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${balanceColor}`}>
                        {stats.balance > 0 ? "+" : ""}{stats.balance}
                    </div>
                    <p className="text-xs text-muted-foreground">{balanceLabel}</p>
                </CardContent>
            </Card>
        </div>
    );
}
