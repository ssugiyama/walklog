'use client'
import React, { Suspense } from 'react'
import { DataProvider } from '../../lib/utils/data-context'
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter'
import Main from './main'
import { UserContextProvider } from '../../lib/utils/user-context'
import { MainContextProvider } from '../../lib/utils/main-context'
const Body = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return (
    <AppRouterCacheProvider>
      <UserContextProvider>
        <Suspense>
          <DataProvider>
            <MainContextProvider>
              <Main>
                {children}
              </Main>
            </MainContextProvider>
          </DataProvider>
        </Suspense>
      </UserContextProvider>
    </AppRouterCacheProvider>
  )
}

export default Body
