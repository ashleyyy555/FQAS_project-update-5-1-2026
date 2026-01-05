import Sidebar from "@/components/Sidebar"

export default function MainLayout ({
    children,
    }: {
    children: React.ReactNode
    }) {
    return (
      <div className="flex" min-h-screen>

        {/* Render the integrated Sidebar component */}
          <Sidebar />
          
          {/* Main content area: ml-56 offsets the fixed 56-unit width of the sidebar */}
          <main className="flex-grow ml-56 p-8">
            {children}
          </main>
        </div>
    )
    }